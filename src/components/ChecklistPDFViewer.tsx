import { ChecklistRenderer, ChecklistItem } from './ChecklistRenderer';

interface ChecklistPDFViewerProps {
  checklistData: string | null;
  checklistItens?: ChecklistItem[];
  styles: any;
}

export default function ChecklistPDFViewer({ checklistData, checklistItens = [], styles }: ChecklistPDFViewerProps) {
  return (
    <ChecklistRenderer 
      checklistData={checklistData}
      checklistItens={checklistItens}
      styles={styles}
      mode="viewer"
    />
  );
}
