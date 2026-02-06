import React, { useState, useEffect } from 'react';
import { LineChart, Line, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../api';

interface RatingHistoryEntry {
  id: string;
  userId: string;
  gameId: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  createdAt: string;
}

interface ChartData {
  date: string;
  rating: number;
  change: number;
}

export const RatingChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRatingHistory();
  }, []);

  const loadRatingHistory = async () => {
    try {
      setLoading(true);
      const history = await apiService.getRatingHistory();
      
      // Фильтруем только рейтинговые игры и сортируем по дате
      const sortedHistory = [...history].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Преобразуем в данные для графика
      const chartData: ChartData[] = sortedHistory.map((entry: RatingHistoryEntry) => {
        const date = new Date(entry.createdAt);
        const formattedDate = date.toLocaleString(undefined, { 
          year: 'numeric',
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        return {
          date: formattedDate,
          rating: entry.ratingAfter,
          change: entry.ratingChange
        };
      });

      setData(chartData);
    } catch (err) {
      console.error('Error loading rating history:', err);
      setError('Ошибка загрузки истории рейтинга');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="rating-chart-loading">Загрузка графика...</div>;
  }

  if (error) {
    return <div className="rating-chart-error">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="rating-chart-empty">Нет данных об истории рейтинга</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const changeSign = data.change > 0 ? '+' : '';
      const changeColor = data.change > 0 ? 'var(--success-text)' : data.change < 0 ? 'var(--danger-text)' : 'var(--muted)';
      
      return (
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '8px 12px',
          color: 'var(--text)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>{data.date}</p>
          <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 500 }}>
            Рейтинг: {data.rating}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: changeColor, fontWeight: 500 }}>
            {changeSign}{data.change}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rating-chart-container">
      <h3>История рейтинга</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <YAxis 
            stroke="var(--muted)" 
            tick={{ fontSize: 12 }}
            domain={['dataMin - 20', 'dataMax + 20']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="rating" 
            stroke="var(--accent)" 
            dot={{ fill: 'var(--accent)', r: 4 }}
            activeDot={{ r: 6 }}
            strokeWidth={2}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
