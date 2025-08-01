import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ChartType,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface LearningCurveChartProps {
  rewards: number[];
  steps: number[];
}

const LearningCurveChart: React.FC<LearningCurveChartProps> = ({ rewards, steps }) => {
  const data = {
    labels: rewards.map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: 'Reward',
        data: rewards,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
        tension: 0.1,
        fill: true,
      },
      {
        label: 'Steps',
        data: steps,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Learning Curve (Reward vs Steps)' },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<ChartType>[]) => `Episode ${items[0].label}`,
          label: (item: TooltipItem<ChartType>) => `${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Reward',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Steps',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        type: 'linear' as const,
        display: true,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Episode',
        },
      },
    },
  };

  return (
    <div style={{ height: 350, width: '100%' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default LearningCurveChart; 