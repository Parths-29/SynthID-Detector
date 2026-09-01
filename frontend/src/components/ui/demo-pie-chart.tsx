import { PieChart } from "@/components/ui/pie-chart";

const DemoPieChart = () => {
  const width = 600;
  const height = 400;

  return (
    <div className="flex w-full h-screen justify-center items-center bg-gray-100">
      <PieChart width={width} height={height} animate={true} />
    </div>
  );
};

export { DemoPieChart };
