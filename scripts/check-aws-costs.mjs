#!/usr/bin/env node

/**
 * Check AWS costs for Project Lazarus
 * 
 * This script queries AWS Cost Explorer to show actual spending on:
 * - Bedrock (Claude API calls)
 * - Lambda executions
 * - RDS database
 * - S3 storage
 * 
 * Usage: node scripts/check-aws-costs.mjs [days]
 * Example: node scripts/check-aws-costs.mjs 7  (last 7 days)
 */

import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const costExplorer = new CostExplorerClient({ region: 'us-east-1' });
const cloudwatch = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Get date range
const days = parseInt(process.argv[2]) || 30;
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

const formatDate = (date) => date.toISOString().split('T')[0];

console.log(`\n📊 AWS Cost Analysis for Project Lazarus`);
console.log(`📅 Period: ${formatDate(startDate)} to ${formatDate(endDate)} (${days} days)\n`);

async function getCosts() {
  try {
    // Get overall costs by service
    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: formatDate(startDate),
        End: formatDate(endDate),
      },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost', 'UsageQuantity'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
      Filter: {
        Or: [
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['Amazon Bedrock'],
            },
          },
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['AWS Lambda'],
            },
          },
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['Amazon Relational Database Service'],
            },
          },
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['Amazon Simple Storage Service'],
            },
          },
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['Amazon API Gateway'],
            },
          },
        ],
      },
    });

    const response = await costExplorer.send(command);

    // Aggregate costs by service
    const serviceCosts = {};
    const dailyCosts = {};

    response.ResultsByTime.forEach((result) => {
      const date = result.TimePeriod.Start;
      dailyCosts[date] = dailyCosts[date] || 0;

      result.Groups.forEach((group) => {
        const service = group.Keys[0];
        const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
        const usage = parseFloat(group.Metrics.UsageQuantity.Amount);

        serviceCosts[service] = serviceCosts[service] || { cost: 0, usage: 0 };
        serviceCosts[service].cost += cost;
        serviceCosts[service].usage += usage;
        dailyCosts[date] += cost;
      });
    });

    // Display results
    console.log('💰 Total Costs by Service:\n');
    
    let totalCost = 0;
    const sortedServices = Object.entries(serviceCosts).sort((a, b) => b[1].cost - a[1].cost);
    
    sortedServices.forEach(([service, data]) => {
      const serviceName = service.replace('Amazon ', '').replace('AWS ', '');
      console.log(`   ${serviceName.padEnd(35)} $${data.cost.toFixed(2)}`);
      totalCost += data.cost;
    });
    
    console.log(`   ${'─'.repeat(35)} ${'─'.repeat(10)}`);
    console.log(`   ${'TOTAL'.padEnd(35)} $${totalCost.toFixed(2)}\n`);

    // Show daily trend
    console.log('📈 Daily Cost Trend (last 7 days):\n');
    const recentDates = Object.keys(dailyCosts).sort().slice(-7);
    recentDates.forEach((date) => {
      const cost = dailyCosts[date];
      const bar = '█'.repeat(Math.ceil(cost * 10));
      console.log(`   ${date}  $${cost.toFixed(2).padStart(6)}  ${bar}`);
    });
    console.log();

    // Estimate monthly cost
    const avgDailyCost = totalCost / days;
    const estimatedMonthlyCost = avgDailyCost * 30;
    
    console.log('📊 Projections:\n');
    console.log(`   Average daily cost:        $${avgDailyCost.toFixed(2)}`);
    console.log(`   Estimated monthly cost:    $${estimatedMonthlyCost.toFixed(2)}\n`);

    // Get Bedrock-specific details if available
    if (serviceCosts['Amazon Bedrock']) {
      console.log('🤖 Bedrock (Claude) Details:\n');
      await getBedrockDetails();
    }

    // Get Lambda invocation counts
    if (serviceCosts['AWS Lambda']) {
      console.log('\n⚡ Lambda Invocation Summary:\n');
      await getLambdaInvocations();
    }

  } catch (error) {
    if (error.name === 'AccessDeniedException') {
      console.error('❌ Error: No permission to access Cost Explorer API');
      console.error('   You need to enable Cost Explorer and grant IAM permissions:');
      console.error('   - ce:GetCostAndUsage');
      console.error('   - ce:GetCostForecast\n');
      console.error('   To enable: https://console.aws.amazon.com/cost-management/home#/cost-explorer\n');
    } else {
      console.error('❌ Error fetching costs:', error.message);
    }
  }
}

async function getBedrockDetails() {
  try {
    // Get detailed Bedrock costs by model
    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: formatDate(startDate),
        End: formatDate(endDate),
      },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost', 'UsageQuantity'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'USAGE_TYPE',
        },
      ],
      Filter: {
        Dimensions: {
          Key: 'SERVICE',
          Values: ['Amazon Bedrock'],
        },
      },
    });

    const response = await costExplorer.send(command);
    
    if (response.ResultsByTime.length > 0) {
      const groups = response.ResultsByTime[0].Groups;
      
      groups.forEach((group) => {
        const usageType = group.Keys[0];
        const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
        
        // Parse usage type to identify model and token type
        let description = usageType;
        if (usageType.includes('Input')) {
          description = '   Input tokens (prompts)';
        } else if (usageType.includes('Output')) {
          description = '   Output tokens (responses)';
        }
        
        if (cost > 0) {
          console.log(`   ${description.padEnd(35)} $${cost.toFixed(2)}`);
        }
      });
    }
  } catch (error) {
    console.log('   Unable to fetch detailed Bedrock metrics');
  }
}

async function getLambdaInvocations() {
  try {
    // Try to get Lambda invocation counts from CloudWatch Logs
    const functions = [
      'lazarus-api-chat',
      'lazarus-api-fact-extraction',
      'lazarus-api-relationships',
    ];

    for (const functionName of functions) {
      try {
        const command = new FilterLogEventsCommand({
          logGroupName: `/aws/lambda/${functionName}`,
          startTime: startDate.getTime(),
          endTime: endDate.getTime(),
          filterPattern: 'REPORT RequestId',
          limit: 1000,
        });

        const response = await cloudwatch.send(command);
        const invocations = response.events?.length || 0;
        
        if (invocations > 0) {
          console.log(`   ${functionName.padEnd(35)} ${invocations} invocations`);
        }
      } catch (error) {
        // Log group might not exist or no permissions
        console.log(`   ${functionName.padEnd(35)} (no data)`);
      }
    }
  } catch (error) {
    console.log('   Unable to fetch Lambda invocation counts');
  }
}

// Cost optimization recommendations
function showRecommendations(serviceCosts) {
  console.log('\n💡 Cost Optimization Recommendations:\n');
  
  const bedrockCost = serviceCosts['Amazon Bedrock']?.cost || 0;
  const lambdaCost = serviceCosts['AWS Lambda']?.cost || 0;
  const rdsCost = serviceCosts['Amazon Relational Database Service']?.cost || 0;
  
  if (bedrockCost > 10) {
    console.log('   🤖 Bedrock (Claude) is your highest cost:');
    console.log('      • Consider caching more aggressively');
    console.log('      • Reduce fact extraction frequency');
    console.log('      • Use smaller prompts where possible');
    console.log('      • Batch relationship extraction\n');
  }
  
  if (rdsCost > 20) {
    console.log('   💾 RDS costs are significant:');
    console.log('      • Consider using a smaller instance type');
    console.log('      • Enable auto-pause for dev environments');
    console.log('      • Review if you need Multi-AZ\n');
  }
  
  if (lambdaCost < 1) {
    console.log('   ✅ Lambda costs are minimal (good!)');
  }
  
  console.log('   📝 General tips:');
  console.log('      • Enable AWS Budgets to get alerts');
  console.log('      • Use AWS Cost Anomaly Detection');
  console.log('      • Review CloudWatch Logs retention (default 30 days)\n');
}

// Run the analysis
getCosts().then(() => {
  console.log('✅ Cost analysis complete\n');
  console.log('💡 To reduce costs, consider:');
  console.log('   1. Implementing more aggressive caching for AI operations');
  console.log('   2. Reducing fact extraction frequency');
  console.log('   3. Using batch processing for relationships');
  console.log('   4. Monitoring Bedrock token usage\n');
}).catch((error) => {
  console.error('Failed to complete cost analysis:', error);
  process.exit(1);
});
