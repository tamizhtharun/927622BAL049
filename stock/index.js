const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Base URL for the test server API
const TEST_SERVER_API_BASE_URL = 'http://20.244.56.144/evaluation-service';

// Bearer token for authentication
const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ4MDcxOTQ2LCJpYXQiOjE3NDgwNzE2NDYsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjliMjQwYjE2LTRlMTgtNGRmOS05NGY1LTM2MDRiZWQ1NDMzYSIsInN1YiI6IjkyNzYyMmJhbDA0OUBta2NlLmFjLmluIn0sImVtYWlsIjoiOTI3NjIyYmFsMDQ5QG1rY2UuYWMuaW4iLCJuYW1lIjoidGFtaWwgc2VsdmFuIHYiLCJyb2xsTm8iOiI5Mjc2MjJiYWwwNDkiLCJhY2Nlc3NDb2RlIjoid2hlUVV5IiwiY2xpZW50SUQiOiI5YjI0MGIxNi00ZTE4LTRkZjktOTRmNS0zNjA0YmVkNTQzM2EiLCJjbGllbnRTZWNyZXQiOiJDRFBKSGdVVVVYY3BlSnBxIn0.93rwyA4pE4nc9lYyQ5ndxzFnADSOeGySeJw-ftJElE4";

// Fetch price history array for a ticker and minutes from test server API
async function fetchPriceHistory(ticker, minutes) {
  try {
    const url = `${TEST_SERVER_API_BASE_URL}/stocks/${ticker}?minutes=${minutes}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`
      }
    });
    // Response is an array of { price, lastUpdatedAt }
    return response.data;
  } catch (error) {
    console.error(`Error fetching price history for ${ticker}:`, error.response ? error.response.data : error.message);
    throw new Error(`Failed to fetch price history for ${ticker}: ${error.message}`);
  }
}

// Calculate average price
function calculateAveragePrice(priceHistory) {
  if (priceHistory.length === 0) return 0;
  const sum = priceHistory.reduce((acc, entry) => acc + entry.price, 0);
  return sum / priceHistory.length;
}

// Calculate covariance
function covariance(arrX, arrY) {
  const n = arrX.length;
  const meanX = arrX.reduce((a, b) => a + b, 0) / n;
  const meanY = arrY.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (arrX[i] - meanX) * (arrY[i] - meanY);
  }
  return cov / (n - 1);
}

// Calculate standard deviation
function standardDeviation(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (arr[i] - mean) ** 2;
  }
  variance /= (n - 1);
  return Math.sqrt(variance);
}

// Calculate Pearson correlation coefficient
function pearsonCorrelation(arrX, arrY) {
  const cov = covariance(arrX, arrY);
  const stdX = standardDeviation(arrX);
  const stdY = standardDeviation(arrY);
  if (stdX === 0 || stdY === 0) return 0;
  return cov / (stdX * stdY);
}

// Align price histories by timestamp within a threshold (e.g., 1 minute)
function alignPriceHistories(historyA, historyB, thresholdMs = 300000) { // Increased threshold to 5 minutes (300000 ms)
  const alignedA = [];
  const alignedB = [];
  let i = 0, j = 0;
  while (i < historyA.length && j < historyB.length) {
    const timeA = new Date(historyA[i].lastUpdatedAt).getTime();
    const timeB = new Date(historyB[j].lastUpdatedAt).getTime();
    const diff = timeA - timeB;
    if (Math.abs(diff) <= thresholdMs) {
      alignedA.push(historyA[i].price);
      alignedB.push(historyB[j].price);
      i++;
      j++;
    } else if (diff < 0) {
      i++;
    } else {
      j++;
    }
  }
  return [alignedA, alignedB];
}

// GET /stocks/:ticker?minutes=m&aggregation=average
app.get('/stocks/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const minutes = parseInt(req.query.minutes, 10);
  const aggregation = req.query.aggregation;

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  if (isNaN(minutes) || minutes <= 0) {
    return res.status(400).json({ error: 'Valid minutes parameter is required' });
  }
  if (aggregation !== 'average') {
    return res.status(400).json({ error: 'Only average aggregation is supported' });
  }

  try {
    const priceHistory = await fetchPriceHistory(ticker, minutes);
    const averageStockPrice = calculateAveragePrice(priceHistory);

    return res.json({
      averageStockPrice,
      priceHistory,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /stockcorrelation?minutes=m&ticker=NVDA&ticker=PYPL
app.get('/stockcorrelation', async (req, res) => {
  const minutes = parseInt(req.query.minutes, 10);
  const tickers = req.query.ticker;

  if (!minutes || isNaN(minutes) || minutes <= 0) {
    return res.status(400).json({ error: 'Valid minutes parameter is required' });
  }

  let tickerList = [];
  if (Array.isArray(tickers)) {
    tickerList = tickers.map(t => t.toUpperCase());
  } else if (typeof tickers === 'string') {
    tickerList = [tickers.toUpperCase()];
  }

  if (tickerList.length !== 2) {
    return res.status(400).json({ error: 'Exactly two tickers must be provided for correlation' });
  }

  try {
    const priceHistoryA = await fetchPriceHistory(tickerList[0], minutes);
    const priceHistoryB = await fetchPriceHistory(tickerList[1], minutes);

    const [alignedA, alignedB] = alignPriceHistories(priceHistoryA, priceHistoryB);

    if (alignedA.length === 0 || alignedB.length === 0) {
      return res.status(400).json({ error: 'No overlapping price data found for the given time interval' });
    }

    const averagePriceA = calculateAveragePrice(priceHistoryA);
    const averagePriceB = calculateAveragePrice(priceHistoryB);

    const correlation = pearsonCorrelation(alignedA, alignedB);

    return res.json({
      correlation,
      stocks: {
        [tickerList[0]]: {
          averagePrice: averagePriceA,
          priceHistory: priceHistoryA,
        },
        [tickerList[1]]: {
          averagePrice: averagePriceB,
          priceHistory: priceHistoryB,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stock Price Aggregation Microservice running on port ${PORT}`);
});
