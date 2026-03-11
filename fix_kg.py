#!/usr/bin/env python3
import re

with open('src/components/KnowledgeGraph.tsx', 'r') as f:
    content = f.read()

# 1. Remove TimelineSlider import
content = re.sub(r"import TimelineSlider from './graph/TimelineSlider';\n", '', content)

# 2. Remove the bottom Panel with TimelineSlider
pattern = r'\s+<Panel position="bottom-center"[^>]*>.*?</Panel>\s*</ReactFlow>'
replacement = '''      </ReactFlow>'''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 3. Update GraphControls to pass all props
old_gc = '<GraphControls filters={filters} onFilterChange={handleFilterChange} />'
new_gc = '''<GraphControls 
            filters={filters} 
            onFilterChange={handleFilterChange}
            currentTime={currentTime}
            timelineEvents={timelineEvents}
            onTimeChange={handleTimeChange}
            searchQuery=""
            searchResults={[]}
            onSearch={() => {}}
            onSearchResultClick={() => {}}
          />'''
content = content.replace(old_gc, new_gc)

# 4. Update Panel z-index
content = content.replace(
    '<Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4 z-10">',
    '<Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4" style={{ zIndex: 2147483648 }}>'
)

# 5. Add missing props to NodeDetailPanel
old_ndp = '''<NodeDetailPanel
              node={selectedNode}
              edges={edges}
              onClose={() => setSelectedNode(null)}
            />'''
new_ndp = '''<NodeDetailPanel
              node={selectedNode}
              edges={edges}
              nodes={nodes}
              onClose={() => setSelectedNode(null)}
              onNodeSelect={() => {}}
            />'''
content = content.replace(old_ndp, new_ndp)

with open('src/components/KnowledgeGraph.tsx', 'w') as f:
    f.write(content)

print("Fixed!")
