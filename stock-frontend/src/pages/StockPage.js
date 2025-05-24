import React, { useState, useEffect } from 'react';
import { Typography, TextField, MenuItem, Box, CircularProgress } from '@mui/material';
import StockChart from '../components/StockChart';
import axios from 'axios';

const timeOptions = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
  { label: '120 minutes', value: 120 },
];

const StockPage = () => {
  const [ticker, setTicker] = useState('NVDA');
  const [minutes, setMinutes] = useState(60);
  const [priceHistory, setPriceHistory] = useState([]);
  const [averagePrice, setAveragePrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/stocks/${ticker}?minutes=${minutes}&aggregation=average`);
      setPriceHistory(response.data.priceHistory);
      setAveragePrice(response.data.averageStockPrice);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setPriceHistory([]);
      setAveragePrice(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [ticker, minutes]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Stock Price Chart
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
        <TextField
          label="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          sx={{ width: 150 }}
        />
        <TextField
          select
          label="Time Interval"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          sx={{ width: 150 }}
        >
          {timeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <StockChart priceHistory={priceHistory} averagePrice={averagePrice} />
      )}
    </Box>
  );
};

export default StockPage;
