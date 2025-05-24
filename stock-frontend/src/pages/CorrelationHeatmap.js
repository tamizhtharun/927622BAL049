import React, { useState, useEffect } from 'react';
import { Typography, Box, CircularProgress, Slider, Tooltip } from '@mui/material';
import axios from 'axios';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

const CorrelationHeatmap = () => {
  const [minutes, setMinutes] = useState(60);
  const [stocks, setStocks] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of stocks on mount
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await axios.get('/stocks');
        // response.data.stocks is an object { "Company Name": "TICKER", ... }
        const stockList = Object.values(response.data.stocks || {});
        setStocks(stockList);
      } catch (err) {
        setError('Failed to fetch stocks list');
      }
    };
    fetchStocks();
  }, []);

  // Fetch correlations for all pairs
  useEffect(() => {
    if (stocks.length === 0) return;

    const fetchCorrelations = async () => {
      setLoading(true);
      setError(null);
      const results = [];
      try {
        for (let i = 0; i < stocks.length; i++) {
          for (let j = i + 1; j < stocks.length; j++) {
            const tickerA = stocks[i];
            const tickerB = stocks[j];
            try {
              const response = await axios.get('/stockcorrelation', {
                params: {
                  minutes,
                  ticker: [tickerA, tickerB],
                },
              });
              results.push({
                x: tickerA,
                y: tickerB,
                correlation: response.data.correlation,
                averageA: response.data.stocks[tickerA].averagePrice,
                stdDevA: calculateStdDev(response.data.stocks[tickerA].priceHistory),
                averageB: response.data.stocks[tickerB].averagePrice,
                stdDevB: calculateStdDev(response.data.stocks[tickerB].priceHistory),
              });
            } catch {
              // Ignore errors for individual pairs
            }
          }
        }
        setCorrelations(results);
      } catch (err) {
        setError('Failed to fetch correlations');
      } finally {
        setLoading(false);
      }
    };

    fetchCorrelations();
  }, [stocks, minutes]);

  // Calculate standard deviation from price history
  const calculateStdDev = (priceHistory) => {
    if (!priceHistory || priceHistory.length === 0) return 0;
    const prices = priceHistory.map((p) => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / (prices.length - 1);
    return Math.sqrt(variance);
  };

  // Prepare data for heatmap
  const data = correlations.map((item) => ({
    x: item.x,
    y: item.y,
    z: Math.abs(item.correlation),
    correlation: item.correlation,
    averageA: item.averageA,
    stdDevA: item.stdDevA,
    averageB: item.averageB,
    stdDevB: item.stdDevB,
  }));

  // Color scale function for correlation strength
  const getColor = (correlation) => {
    if (correlation > 0.7) return '#4caf50'; // strong positive - green
    if (correlation > 0.3) return '#aed581'; // moderate positive - light green
    if (correlation > -0.3) return '#fbc02d'; // weak/no correlation - yellow
    if (correlation > -0.7) return '#ff8a65'; // moderate negative - orange
    return '#d32f2f'; // strong negative - red
  };

  const CustomTooltipContent = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{ backgroundColor: 'white', border: '1px solid #ccc', padding: 1 }}>
          <Typography variant="body2">
            {data.x} &amp; {data.y}
          </Typography>
          <Typography variant="body2">Correlation: {data.correlation.toFixed(4)}</Typography>
          <Typography variant="body2">
            {data.x} Avg: {data.averageA.toFixed(2)}, Std Dev: {data.stdDevA.toFixed(2)}
          </Typography>
          <Typography variant="body2">
            {data.y} Avg: {data.averageB.toFixed(2)}, Std Dev: {data.stdDevB.toFixed(2)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Correlation Heatmap
      </Typography>
      <Box sx={{ width: 300, marginBottom: 2 }}>
        <Typography gutterBottom>Time Interval (minutes): {minutes}</Typography>
        <Slider
          value={minutes}
          min={5}
          max={120}
          step={5}
          onChange={(e, val) => setMinutes(val)}
          valueLabelDisplay="auto"
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={600}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis type="category" dataKey="x" name="Stock A" />
            <YAxis type="category" dataKey="y" name="Stock B" />
            <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Correlation Strength" />
            <RechartsTooltip content={<CustomTooltipContent />} />
            <Legend />
            <Scatter
              name="Correlation"
              data={data}
              fill="#8884d8"
              shape="circle"
              fillOpacity={0.8}
              stroke="#555"
              strokeWidth={1}
              // Use color based on correlation
              // Recharts does not support per-point color easily, so we use fillOpacity as proxy
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default CorrelationHeatmap;
