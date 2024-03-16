import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { ReactNode } from "react";

interface LineGraphProps {
  title: string;
  xAxisData: string[];
  yAxisData: number[];
  lineColor: string;
  noDataElement?: ReactNode;
}

const CustomGraph = (props: LineGraphProps) => {
  const graphData = {
    labels: props.xAxisData,
    datasets: [
      {
        label: props.title,
        data: props.yAxisData,
        fill: false,
        borderColor: props.lineColor,
        tension: 0,
      },
    ],
  };

  if (
    !props.xAxisData ||
    props.xAxisData.length === 0 ||
    props.xAxisData.length === 1
  ) {
    return props.noDataElement ? props.noDataElement : <div></div>;
  }

  return (
    <Line
      data={graphData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              display: false,
            },
            grid: {
              display: false,
            },
            title: {
              display: false,
            },
            display: false,
          },
          y: {
            ticks: {
              display: false,
            },
            grid: {
              display: false,
            },
            title: {
              display: false,
            },
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        elements: {
          line: {
            borderWidth: 3,
            borderCapStyle: "round",
            fill: false,
          },
          point: {
            radius: 0,
            hitRadius: 20,
            hoverRadius: 5,
          },
        },
      }}
    />
  );
};

export default CustomGraph;
