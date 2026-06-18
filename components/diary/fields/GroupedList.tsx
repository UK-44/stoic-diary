"use client";

import type { GroupedListValue } from "@/lib/diary/types";
import { BulletList } from "./BulletList";

type Props = {
  groups: string[];
  value: GroupedListValue;
  onChange: (next: GroupedListValue) => void;
};

export function GroupedList({ groups, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <div className="text-sm font-medium text-zinc-300">{group}</div>
          <BulletList
            value={value[group] ?? []}
            onChange={(next) => onChange({ ...value, [group]: next })}
          />
        </div>
      ))}
    </div>
  );
}
