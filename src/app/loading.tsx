export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
      <div className="w-14 h-14 border-4 border-[#D1FE6E] rounded-full animate-spin border-t-transparent" />
      <p className="text-gray-400">Carregando...</p>
      <p className="text-sm text-gray-500">Na primeira vez pode levar até 1 minuto.</p>
    </div>
  );
}
