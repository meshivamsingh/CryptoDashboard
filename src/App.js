import "./App.css";
import { useState, useEffect } from "react";

function App() {
  const [cryptoData, setCryptoData] = useState({
    bitcoin: {
      price: "Loading...",
      change24h: "0",
      marketCap: "0",
      volume24h: "0",
      circulatingSupply: "0",
      maxSupply: "0",
    },
    ethereum: {
      price: "Loading...",
      change24h: "0",
      marketCap: "0",
      volume24h: "0",
      circulatingSupply: "0",
      maxSupply: "0",
    },
    cardano: {
      price: "Loading...",
      change24h: "0",
      marketCap: "0",
      volume24h: "0",
      circulatingSupply: "0",
      maxSupply: "0",
    },
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState("24h");
  const [news, setNews] = useState([]);
  const [newsError, setNewsError] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(() => {
    const savedPortfolio = localStorage.getItem("cryptoPortfolio");
    return savedPortfolio
      ? JSON.parse(savedPortfolio)
      : {
          holdings: {},
          totalValue: 0,
          totalProfit: 0,
          profitPercentage: 0,
        };
  });
  const [showAddCrypto, setShowAddCrypto] = useState(false);
  const [newCrypto, setNewCrypto] = useState({
    symbol: "",
    amount: "",
    purchasePrice: "",
  });

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        console.log("Fetching crypto data...");
        const response = await fetch(
          process.env.NODE_ENV === "production"
            ? "/api/crypto"
            : "http://localhost:5000/api/crypto"
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Received data:", data);

        if (!data || !data.data) {
          throw new Error("No data received from API");
        }

        setCryptoData({
          bitcoin: {
            price: `$${Number(data.data.BTC.quote.USD.price).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
            change24h: data.data.BTC.quote.USD.percent_change_24h.toFixed(2),
            marketCap: `$${(
              Number(data.data.BTC.quote.USD.market_cap) / 1e9
            ).toFixed(2)}B`,
            volume24h: `$${(
              Number(data.data.BTC.quote.USD.volume_24h) / 1e9
            ).toFixed(2)}B`,
            circulatingSupply: `${(
              Number(data.data.BTC.circulating_supply) / 1e6
            ).toFixed(2)}M`,
            maxSupply: `${(Number(data.data.BTC.max_supply) / 1e6).toFixed(
              2
            )}M`,
          },
          ethereum: {
            price: `$${Number(data.data.ETH.quote.USD.price).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
            change24h: data.data.ETH.quote.USD.percent_change_24h.toFixed(2),
            marketCap: `$${(
              Number(data.data.ETH.quote.USD.market_cap) / 1e9
            ).toFixed(2)}B`,
            volume24h: `$${(
              Number(data.data.ETH.quote.USD.volume_24h) / 1e9
            ).toFixed(2)}B`,
            circulatingSupply: `${(
              Number(data.data.ETH.circulating_supply) / 1e6
            ).toFixed(2)}M`,
            maxSupply: "∞",
          },
          cardano: {
            price: `$${Number(data.data.ADA.quote.USD.price).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
            change24h: data.data.ADA.quote.USD.percent_change_24h.toFixed(2),
            marketCap: `$${(
              Number(data.data.ADA.quote.USD.market_cap) / 1e9
            ).toFixed(2)}B`,
            volume24h: `$${(
              Number(data.data.ADA.quote.USD.volume_24h) / 1e9
            ).toFixed(2)}B`,
            circulatingSupply: `${(
              Number(data.data.ADA.circulating_supply) / 1e9
            ).toFixed(2)}B`,
            maxSupply: `${(Number(data.data.ADA.max_supply) / 1e9).toFixed(
              2
            )}B`,
          },
        });
        setError(null);
      } catch (error) {
        console.error("Error fetching crypto data:", error);
        setError(error.message);
      }
    };

    const fetchNews = async () => {
      try {
        setLoading(true);
        setNewsError(null);

        let alphaVantageData = { feed: [] };
        let cryptoPanicData = { results: [] };

        // Try to fetch from Alpha Vantage
        try {
          console.log("Fetching Alpha Vantage news...");
          const alphaVantageResponse = await fetch(
            process.env.NODE_ENV === "production"
              ? "/api/news/alphavantage"
              : "http://localhost:5000/api/news/alphavantage",
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          );
          console.log(
            "Alpha Vantage Response Status:",
            alphaVantageResponse.status
          );

          if (alphaVantageResponse.ok) {
            alphaVantageData = await alphaVantageResponse.json();
            console.log(
              "Alpha Vantage data received:",
              JSON.stringify(alphaVantageData, null, 2)
            );
          } else {
            const errorText = await alphaVantageResponse.text();
            console.warn(
              "Alpha Vantage response not OK:",
              alphaVantageResponse.status,
              errorText
            );
          }
        } catch (error) {
          console.warn("Alpha Vantage fetch failed:", error);
        }

        // Try to fetch from CryptoPanic
        try {
          console.log("Fetching CryptoPanic news...");
          const cryptoPanicResponse = await fetch(
            process.env.NODE_ENV === "production"
              ? "/api/news/cryptopanic"
              : "http://localhost:5000/api/news/cryptopanic",
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          );
          console.log(
            "CryptoPanic Response Status:",
            cryptoPanicResponse.status
          );

          if (cryptoPanicResponse.ok) {
            cryptoPanicData = await cryptoPanicResponse.json();
            console.log(
              "CryptoPanic data received:",
              JSON.stringify(cryptoPanicData, null, 2)
            );
          } else {
            const errorText = await cryptoPanicResponse.text();
            console.warn(
              "CryptoPanic response not OK:",
              cryptoPanicResponse.status,
              errorText
            );
          }
        } catch (error) {
          console.warn("CryptoPanic fetch failed:", error);
        }

        // Combine and format news from all sources
        const formattedNews = [
          ...(alphaVantageData.feed || []).map((item) => ({
            title: item.title || "No title available",
            description: item.summary || "No description available",
            image:
              item.banner_image ||
              item.url_to_image ||
              "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=200&fit=crop",
            source: item.source || "Unknown source",
            publishedAt: item.time_published,
            url: item.url,
            type: "alphavantage",
          })),
          ...(cryptoPanicData.results || []).map((item) => ({
            title: item.title || "No title available",
            description:
              item.currencies?.[0]?.code || "No description available",
            image:
              item.screenshot ||
              item.url_to_image ||
              "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=200&fit=crop",
            source: item.domain || "Unknown source",
            publishedAt: item.published_at,
            url: item.url,
            type: "cryptopanic",
          })),
        ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        console.log(
          "Combined news data:",
          JSON.stringify(formattedNews, null, 2)
        );

        if (formattedNews.length === 0) {
          throw new Error("No news articles found");
        }

        setNews(formattedNews);

        // Calculate overall sentiment if Alpha Vantage data is available
        if (alphaVantageData.feed && alphaVantageData.feed.length > 0) {
          const sentimentScore =
            alphaVantageData.feed.reduce((acc, item) => {
              return acc + (item.overall_sentiment_score || 0);
            }, 0) / alphaVantageData.feed.length;

          setSentiment({
            score: sentimentScore,
            label:
              sentimentScore > 0.5
                ? "Bullish"
                : sentimentScore < -0.5
                ? "Bearish"
                : "Neutral",
          });
        }
      } catch (error) {
        console.error("Error fetching news:", error);
        setNewsError(error.message);
        // Set some fallback news data
        setNews([
          {
            title: "Unable to load news",
            description: "Please check your connection and try again later.",
            image:
              "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=200&fit=crop",
            source: "System",
            publishedAt: new Date().toISOString(),
            url: "#",
            type: "system",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCryptoData();
    fetchNews();

    // Set up intervals for updates
    const cryptoInterval = setInterval(fetchCryptoData, 60000); // Update every minute
    const newsInterval = setInterval(fetchNews, 300000); // Update every 5 minutes

    return () => {
      clearInterval(cryptoInterval);
      clearInterval(newsInterval);
    };
  }, []);

  useEffect(() => {
    const updatePortfolioValue = () => {
      const updatedPortfolio = { ...portfolio };
      let totalValue = 0;
      let totalCost = 0;

      Object.entries(portfolio.holdings).forEach(([symbol, holding]) => {
        const currentPrice = cryptoData[symbol.toLowerCase()]?.price;
        if (currentPrice) {
          const value =
            holding.amount *
            parseFloat(currentPrice.replace("$", "").replace(",", ""));
          totalValue += value;
          totalCost += holding.amount * holding.purchasePrice;
        }
      });

      updatedPortfolio.totalValue = totalValue;
      updatedPortfolio.totalProfit = totalValue - totalCost;
      updatedPortfolio.profitPercentage =
        totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

      setPortfolio(updatedPortfolio);
      localStorage.setItem("cryptoPortfolio", JSON.stringify(updatedPortfolio));
    };

    if (Object.keys(cryptoData).length > 0) {
      updatePortfolioValue();
    }
  }, [cryptoData]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const filteredCryptos = Object.entries(cryptoData).filter(([name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hours ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} days ago`;
    }
  };

  return (
    <div className={`App ${theme}`}>
      <div className="animated-bg"></div>
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Crypto Dashboard</h1>
            <div className="market-status">
              <span
                className={`status-indicator ${sentiment?.label.toLowerCase()}`}
              ></span>
              <span>Market {sentiment?.label || "Loading..."}</span>
            </div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search cryptocurrencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        <nav>
          <ul>
            <li>
              <button
                className={`nav-button ${
                  activeTab === "overview" ? "active" : ""
                }`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
            </li>
            <li>
              <button
                className={`nav-button ${
                  activeTab === "markets" ? "active" : ""
                }`}
                onClick={() => setActiveTab("markets")}
              >
                Markets
              </button>
            </li>
            <li>
              <button
                className={`nav-button ${
                  activeTab === "portfolio" ? "active" : ""
                }`}
                onClick={() => setActiveTab("portfolio")}
              >
                Portfolio
              </button>
            </li>
            <li>
              <button
                className={`nav-button ${activeTab === "news" ? "active" : ""}`}
                onClick={() => setActiveTab("news")}
              >
                News
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === "overview" && (
          <>
            <section className="market-overview">
              <div className="section-header">
                <h2>Market Overview</h2>
                <div className="section-controls">
                  <div className="timeframe-selector">
                    <button
                      className={`timeframe-button ${
                        timeframe === "24h" ? "active" : ""
                      }`}
                      onClick={() => setTimeframe("24h")}
                    >
                      24h
                    </button>
                    <button
                      className={`timeframe-button ${
                        timeframe === "7d" ? "active" : ""
                      }`}
                      onClick={() => setTimeframe("7d")}
                    >
                      7d
                    </button>
                    <button
                      className={`timeframe-button ${
                        timeframe === "30d" ? "active" : ""
                      }`}
                      onClick={() => setTimeframe("30d")}
                    >
                      30d
                    </button>
                  </div>
                  <div className="last-update">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {error && <div className="error-message">Error: {error}</div>}
              <div className="crypto-grid">
                {filteredCryptos.map(([name, data]) => (
                  <div key={name} className="crypto-card">
                    <div className={`crypto-icon ${name}`}>
                      {name === "bitcoin"
                        ? "₿"
                        : name === "ethereum"
                        ? "Ξ"
                        : "₳"}
                    </div>
                    <h3>
                      {name.charAt(0).toUpperCase() + name.slice(1)} (
                      {name === "bitcoin"
                        ? "BTC"
                        : name === "ethereum"
                        ? "ETH"
                        : "ADA"}
                      )
                    </h3>
                    <p className="price">{data.price}</p>
                    <p
                      className={`change ${
                        parseFloat(data.change24h) >= 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {parseFloat(data.change24h) >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(parseFloat(data.change24h))}%
                    </p>
                    <div className="crypto-stats">
                      <div className="stat-item">
                        <span className="stat-label">Market Cap</span>
                        <span className="stat-value">{data.marketCap}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">24h Volume</span>
                        <span className="stat-value">{data.volume24h}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Circulating Supply</span>
                        <span className="stat-value">
                          {data.circulatingSupply}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Max Supply</span>
                        <span className="stat-value">{data.maxSupply}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="market-trends">
              <h2>Market Trends</h2>
              <div className="trends-grid">
                <div className="trend-card">
                  <h3>Bitcoin Dominance</h3>
                  <div className="trend-chart">
                    <div className="trend-bar" style={{ width: "45%" }}></div>
                  </div>
                  <p>45% of total market cap</p>
                </div>
                <div className="trend-card">
                  <h3>Total Market Cap</h3>
                  <div className="trend-chart">
                    <div className="trend-bar" style={{ width: "75%" }}></div>
                  </div>
                  <p>$2.1T</p>
                </div>
                <div className="trend-card">
                  <h3>24h Volume</h3>
                  <div className="trend-chart">
                    <div className="trend-bar" style={{ width: "60%" }}></div>
                  </div>
                  <p>$85B</p>
                </div>
                <div className="trend-card">
                  <h3>Market Sentiment</h3>
                  <div className="trend-chart">
                    <div
                      className={`trend-bar ${
                        sentiment?.label.toLowerCase() || ""
                      }`}
                      style={{
                        width: `${Math.abs(sentiment?.score || 0) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p>{sentiment?.label || "Loading..."}</p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "markets" && (
          <section className="markets-section">
            <div className="section-header">
              <h2>Cryptocurrency Markets</h2>
              <div className="section-controls">
                <div className="timeframe-selector">
                  <button
                    className={`timeframe-button ${
                      timeframe === "24h" ? "active" : ""
                    }`}
                    onClick={() => setTimeframe("24h")}
                  >
                    24h
                  </button>
                  <button
                    className={`timeframe-button ${
                      timeframe === "7d" ? "active" : ""
                    }`}
                    onClick={() => setTimeframe("7d")}
                  >
                    7d
                  </button>
                  <button
                    className={`timeframe-button ${
                      timeframe === "30d" ? "active" : ""
                    }`}
                    onClick={() => setTimeframe("30d")}
                  >
                    30d
                  </button>
                </div>
                <div className="last-update">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            {error && <div className="error-message">Error: {error}</div>}
            <div className="markets-table-container">
              <table className="markets-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>24h Change</th>
                    <th>Market Cap</th>
                    <th>24h Volume</th>
                    <th>Circulating Supply</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCryptos.map(([name, data]) => (
                    <tr key={name}>
                      <td>
                        <div className="crypto-name">
                          <div className={`crypto-icon ${name}`}>
                            {name === "bitcoin"
                              ? "₿"
                              : name === "ethereum"
                              ? "Ξ"
                              : "₳"}
                          </div>
                          <div>
                            <div className="crypto-symbol">
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </div>
                            <div className="crypto-code">
                              {name === "bitcoin"
                                ? "BTC"
                                : name === "ethereum"
                                ? "ETH"
                                : "ADA"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{data.price}</td>
                      <td>
                        <span
                          className={`change ${
                            parseFloat(data.change24h) >= 0
                              ? "positive"
                              : "negative"
                          }`}
                        >
                          {parseFloat(data.change24h) >= 0 ? "↑" : "↓"}{" "}
                          {Math.abs(parseFloat(data.change24h))}%
                        </span>
                      </td>
                      <td>{data.marketCap}</td>
                      <td>{data.volume24h}</td>
                      <td>{data.circulatingSupply}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "portfolio" && (
          <section className="portfolio-section">
            <div className="section-header">
              <h2>Your Portfolio</h2>
              <button
                className="add-crypto-button"
                onClick={() => setShowAddCrypto(true)}
              >
                Add Crypto
              </button>
            </div>

            {showAddCrypto && (
              <div className="add-crypto-form">
                <input
                  type="text"
                  placeholder="Crypto Symbol (e.g., BTC)"
                  value={newCrypto.symbol}
                  onChange={(e) =>
                    setNewCrypto({ ...newCrypto, symbol: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newCrypto.amount}
                  onChange={(e) =>
                    setNewCrypto({ ...newCrypto, amount: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Purchase Price"
                  value={newCrypto.purchasePrice}
                  onChange={(e) =>
                    setNewCrypto({
                      ...newCrypto,
                      purchasePrice: e.target.value,
                    })
                  }
                />
                <div className="form-buttons">
                  <button
                    onClick={() => {
                      const symbol = newCrypto.symbol.toLowerCase();
                      const amount = parseFloat(newCrypto.amount);
                      const purchasePrice = parseFloat(newCrypto.purchasePrice);

                      if (amount && purchasePrice) {
                        const updatedPortfolio = { ...portfolio };
                        if (updatedPortfolio.holdings[symbol]) {
                          const totalAmount =
                            updatedPortfolio.holdings[symbol].amount + amount;
                          const avgPrice =
                            (updatedPortfolio.holdings[symbol].amount *
                              updatedPortfolio.holdings[symbol].purchasePrice +
                              amount * purchasePrice) /
                            totalAmount;
                          updatedPortfolio.holdings[symbol] = {
                            amount: totalAmount,
                            purchasePrice: avgPrice,
                          };
                        } else {
                          updatedPortfolio.holdings[symbol] = {
                            amount,
                            purchasePrice,
                          };
                        }
                        setPortfolio(updatedPortfolio);
                        setShowAddCrypto(false);
                        setNewCrypto({
                          symbol: "",
                          amount: "",
                          purchasePrice: "",
                        });
                      }
                    }}
                  >
                    Add
                  </button>
                  <button onClick={() => setShowAddCrypto(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="portfolio-summary">
              <div className="summary-card">
                <h3>Total Value</h3>
                <p>
                  $
                  {portfolio.totalValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="summary-card">
                <h3>Total Profit/Loss</h3>
                <p
                  className={
                    portfolio.totalProfit >= 0 ? "positive" : "negative"
                  }
                >
                  $
                  {Math.abs(portfolio.totalProfit).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="summary-card">
                <h3>Profit/Loss %</h3>
                <p
                  className={
                    portfolio.profitPercentage >= 0 ? "positive" : "negative"
                  }
                >
                  {portfolio.profitPercentage.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="portfolio-holdings">
              {Object.entries(portfolio.holdings).map(([symbol, holding]) => {
                const currentPrice = cryptoData[symbol.toLowerCase()]?.price;
                const value = currentPrice
                  ? holding.amount *
                    parseFloat(currentPrice.replace("$", "").replace(",", ""))
                  : 0;
                const profit = value - holding.amount * holding.purchasePrice;
                const profitPercentage =
                  (profit / (holding.amount * holding.purchasePrice)) * 100;

                return (
                  <div key={symbol} className="holding-card">
                    <div className="holding-header">
                      <h3>{symbol.toUpperCase()}</h3>
                      <button
                        onClick={() => {
                          const updatedPortfolio = { ...portfolio };
                          delete updatedPortfolio.holdings[symbol];
                          setPortfolio(updatedPortfolio);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="holding-details">
                      <div className="detail-item">
                        <span>Amount:</span>
                        <span>{holding.amount.toFixed(4)}</span>
                      </div>
                      <div className="detail-item">
                        <span>Purchase Price:</span>
                        <span>${holding.purchasePrice.toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <span>Current Value:</span>
                        <span>
                          $
                          {value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span>Profit/Loss:</span>
                        <span className={profit >= 0 ? "positive" : "negative"}>
                          $
                          {Math.abs(profit).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span>Profit/Loss %:</span>
                        <span
                          className={
                            profitPercentage >= 0 ? "positive" : "negative"
                          }
                        >
                          {profitPercentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "news" && (
          <section className="market-news">
            <div className="section-header">
              <h2>Latest News</h2>
              <div className="last-update">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            {newsError && (
              <div className="error-message">
                Error loading news: {newsError}
              </div>
            )}
            {loading ? (
              <div className="loading-spinner">Loading news...</div>
            ) : (
              <div className="news-grid">
                {news.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-card"
                  >
                    <div
                      className="news-image"
                      style={{
                        backgroundImage: `url(${item.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></div>
                    <div className="news-content">
                      <div className={`news-source-badge ${item.type}`}>
                        {item.type === "alphavantage"
                          ? "Alpha Vantage"
                          : item.type === "cryptopanic"
                          ? "CryptoPanic"
                          : "System"}
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <div className="news-meta">
                        <span className="news-source">{item.source}</span>
                        <span className="news-date">
                          {formatTimeAgo(item.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="App-footer">
        <p>Developed by Shivam Singh</p>
      </footer>
    </div>
  );
}

export default App;
