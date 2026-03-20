import { Theme } from '../../lib/themes';
import DocumentUpload from '../DocumentUpload';
import ViewHeader from '../ViewHeader';

interface DocumentsViewProps {
  theme: Theme;
}

export default function DocumentsView({ theme }: DocumentsViewProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ViewHeader theme={theme} title="Documents" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-4xl mx-auto">
            <DocumentUpload theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
