// 📁 src/components/DownloadOSButton.tsx
import { PDFDownloadLink } from '@react-pdf/renderer';
import { OSPdfDocument } from './OSPdfDocument';

export const DownloadOSButton = ({ osData }: { osData: any }) => (
  <PDFDownloadLink
    document={<OSPdfDocument {...osData} />}
    fileName={`os_${osData.cliente}_${osData.data}.pdf`}
  >
    {({ loading }) => (loading ? 'Gerando PDF...' : 'Baixar OS em PDF')}
  </PDFDownloadLink>
);