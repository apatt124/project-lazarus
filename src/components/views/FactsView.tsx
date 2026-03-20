import { Theme } from '../../lib/themes';
import UserFactsPanel from '../UserFactsPanel';
import ViewHeader from '../ViewHeader';

interface FactsViewProps {
  theme: Theme;
}

export default function FactsView({ theme }: FactsViewProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ViewHeader theme={theme} title="Medical Profile" />
      <div className="flex-1 overflow-hidden">
        <UserFactsPanel theme={theme} onClose={() => {}} />
      </div>
    </div>
  );
}
