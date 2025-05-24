import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Typography, Box } from '@mui/material';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { price, lastUpdatedAt } = payload[0].payload;
    return (
      <Box sx={{ backgroundColor: 'white', border: '1px solid #ccc', padding: 1 }}>
        <Typography variant="body2">{new Date(lastUpdatedAt).toLocaleString()}</Typography>
        <Typography variant="body2">Price: {price.toFixed(2)}</Typography>
      </Box>
    );
  }
  return null;
};

const StockChart = ({ priceHistory, averagePrice }) => {
  // Format data for chart
  const data = priceHistory.map((entry) => ({
    price: entry.price,
    lastUpdatedAt: entry.lastUpdatedAt,
    timeLabel: new Date(entry.lastUpdatedAt).toLocaleTimeString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <XAxis dataKey="timeLabel" />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="price" stroke="#1976d2" dot={false} />
        <ReferenceLine y={averagePrice} label={`Avg: ${averagePrice.toFixed(2)}`} stroke="#d32f2f" strokeDasharray="3 3" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StockChart;
