import { HiMiniChartBarSquare } from "react-icons/hi2";

export default function DashboardCard() {
  return (
    <div className="rounded-lg w-full bg-violet-950 py-9 flex justify-center items-center">
      <HiMiniChartBarSquare size={70} className="sm:hidden xl:flex text-white mr-3" />
      <div>
        <h1 className="font-bold text-3xl text-white">Dashboard</h1>
        <h1 className="font-normal text-base text-white">What's happening!?</h1>
      </div>
    </div>
  );
}
