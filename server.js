require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

// Add security headers middleware
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://www.alphavantage.co https://cryptopanic.com https://pro-api.coinmarketcap.com;"
  );
  next();
});

app.use(cors());
app.use(express.json());

// API Keys from environment variables
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

// Validate required environment variables
const requiredEnvVars = [
  { name: "ALPHA_VANTAGE_API_KEY", value: ALPHA_VANTAGE_API_KEY },
  { name: "CRYPTOPANIC_API_KEY", value: CRYPTOPANIC_API_KEY },
  { name: "COINMARKETCAP_API_KEY", value: COINMARKETCAP_API_KEY },
];

const missingEnvVars = requiredEnvVars.filter((env) => !env.value);
if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:");
  missingEnvVars.forEach((env) => console.error(`- ${env.name}`));
}

// Helper function to check if response is JSON
const isJson = (response) => {
  const contentType = response.headers.get("content-type");
  return contentType && contentType.includes("application/json");
};

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Test endpoint to verify server is running
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// List all registered routes
app.get("/routes", (req, res) => {
  const routes = app._router.stack
    .filter((r) => r.route)
    .map((r) => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods),
    }));
  res.json(routes);
});

app.get("/api/crypto", async (req, res) => {
  try {
    console.log("Fetching latest crypto data...");
    const response = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH,ADA&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Historical price data endpoint
app.get("/api/crypto/history", async (req, res) => {
  try {
    const { symbol, timeframe } = req.query;
    console.log(`Fetching historical data for ${symbol} over ${timeframe}`);

    // Convert symbol to uppercase and remove any spaces
    const formattedSymbol = symbol.toUpperCase().trim();

    let count = 24; // Default to 24 hours

    // Convert timeframe to number of data points
    switch (timeframe) {
      case "7d":
        count = 168; // 7 days * 24 hours
        break;
      case "30d":
        count = 720; // 30 days * 24 hours
        break;
      default:
        count = 24; // 24 hours
    }

    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/historical?symbol=${formattedSymbol}&count=${count}&interval=1h`;
    console.log("Requesting URL:", url);

    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received historical data");

    // Format the data for the chart
    const quotes = data.data.quotes || [];
    const timestamps = quotes.map((quote) =>
      new Date(quote.timestamp).toLocaleString()
    );
    const prices = quotes.map((quote) => quote.quote.USD.price);

    res.json({
      timestamps,
      prices,
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Alpha Vantage endpoint
app.get("/api/news/alphavantage", async (req, res) => {
  try {
    console.log("Fetching from Alpha Vantage...");
    console.log("Using API Key:", ALPHA_VANTAGE_API_KEY);

    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=CRYPTO:BTC&apikey=${ALPHA_VANTAGE_API_KEY}`;
    console.log("Request URL:", url);

    const response = await fetch(url);
    console.log("Alpha Vantage Response Status:", response.status);
    console.log("Alpha Vantage Response Headers:", response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Alpha Vantage Error Response:", errorText);
      return res.status(200).json({ feed: [] }); // Return empty feed instead of error
    }

    if (!isJson(response)) {
      const text = await response.text();
      console.error("Alpha Vantage Non-JSON Response:", text);
      return res.status(200).json({ feed: [] }); // Return empty feed instead of error
    }

    const data = await response.json();
    console.log("Alpha Vantage Raw Response:", JSON.stringify(data, null, 2));

    // Check for API limit message
    if (data.Note) {
      console.warn("Alpha Vantage API limit reached:", data.Note);
      return res.status(200).json({ feed: [] }); // Return empty feed instead of error
    }

    // Check if we have valid data
    if (!data.feed) {
      console.warn("No feed data in Alpha Vantage response");
      return res.status(200).json({ feed: [] });
    }

    // Format the feed data to match the expected structure
    const formattedFeed = data.feed.map((item) => ({
      title: item.title,
      summary: item.summary,
      banner_image: item.banner_image,
      source: item.source,
      time_published: item.time_published,
      url: item.url,
      overall_sentiment_score: item.overall_sentiment_score,
    }));

    console.log("Formatted Feed:", JSON.stringify(formattedFeed, null, 2));
    res.json({ feed: formattedFeed });
  } catch (error) {
    console.error("Alpha Vantage Error:", error);
    res.status(200).json({ feed: [] }); // Return empty feed instead of error
  }
});

// CryptoPanic endpoint
app.get("/api/news/cryptopanic", async (req, res) => {
  try {
    console.log("Fetching from CryptoPanic...");

    // Using the correct CryptoPanic API endpoint
    const response = await fetch(
      `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY}&public=true&kind=news&filter=hot`
    );

    console.log("CryptoPanic Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CryptoPanic Error Response:", errorText);
      return res.status(200).json({ results: [] }); // Return empty results instead of error
    }

    if (!isJson(response)) {
      const text = await response.text();
      console.error("CryptoPanic Non-JSON Response:", text);
      return res.status(200).json({ results: [] }); // Return empty results instead of error
    }

    const data = await response.json();
    console.log("CryptoPanic Response Data:", JSON.stringify(data, null, 2));

    res.json(data);
  } catch (error) {
    console.error("CryptoPanic Error:", error);
    res.status(200).json({ results: [] }); // Return empty results instead of error
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Not Found" });
});

// Export the Express app for Vercel
module.exports = app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Available endpoints:`);
    console.log(`- http://localhost:${PORT}/ (Server status)`);
    console.log(`- http://localhost:${PORT}/health (Health check)`);
    console.log(`- http://localhost:${PORT}/routes (List all routes)`);
    console.log(`- http://localhost:${PORT}/api/crypto (Latest crypto data)`);
    console.log(
      `- http://localhost:${PORT}/api/news/alphavantage (Alpha Vantage news)`
    );
    console.log(
      `- http://localhost:${PORT}/api/news/cryptopanic (CryptoPanic news)`
    );
  });
}
