// 遷移時に即座に表示されるスケルトン（ソフトナビの体感速度を上げる）。
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-7 w-40 rounded bg-zinc-900" />
      <div className="h-16 rounded-lg bg-zinc-900" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded bg-zinc-900" />
        <div className="h-10 rounded bg-zinc-900" />
        <div className="h-10 rounded bg-zinc-900" />
      </div>
    </div>
  );
}
