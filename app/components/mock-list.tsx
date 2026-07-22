import { SAGRE_DEMO } from "../data";
import { MockHeader, MockSearch, MockSlider, MockSwitcher, MockTabBar } from "./mock-chrome";
import { StatusBar } from "./phone-frame";
import SagraCard from "./sagra-card";

export default function MockList() {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="px-5 pt-3">
        <MockHeader />
        <div className="mt-4">
          <MockSearch />
          <MockSlider />
        </div>
        <div className="my-4 flex items-center justify-between">
          <span className="text-[11px] font-bold">
            <span className="text-primary-ink">12</span> sagre vicine
          </span>
          <MockSwitcher isMap={false} />
        </div>
      </div>
      {/* la seconda card viene tagliata dal bordo: è la lista che continua */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-5">
        {SAGRE_DEMO.slice(0, 2).map((s) => (
          <SagraCard key={s.nome} sagra={s} />
        ))}
      </div>
      <MockTabBar active="sagre" />
    </div>
  );
}
