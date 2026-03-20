import { Theme } from '../../lib/themes';
import KnowledgeGraph from '../KnowledgeGraph';
import ViewHeader from '../ViewHeader';

interface GraphViewProps {
  theme: Theme;
}

export default function GraphView({ theme }: GraphViewProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ViewHeader theme={theme} title="Knowledge Graph" />
      <div className="flex-1 overflow-hidden">
        <KnowledgeGraph userId="user-1" theme={theme} />
      </div>
    </div>
  );
}
