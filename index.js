import axios from 'axios';
import { performance } from 'perf_hooks';

const logQueue = [];


const flushQueue = async () => {
  const queueCopy = [...logQueue];
  logQueue.length = 0;

  for (const { url, apiKey, data } of queueCopy) {
    try {
      await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: 3000, 
      });
    } catch (e) {
      logQueue.push({ url, apiKey, data }); 
    }
  }
};

setInterval(flushQueue, 5000); // retry every 5s

const sentinelLogger = ({ apiKey, url ='https://sentinel-backend-9cgt.onrender.com/api/v1/track' }) => {
  if (!apiKey ) {
    throw new Error('Sentinel Logger: apiKey are required');
  }

  return (req, res, next) => {
    const start = performance.now();

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    const prepareLog = () => {
      const duration = performance.now() - start;
      const log = {
        path: req.baseUrl.toLowerCase() + req.path.toLowerCase(),
        method: req.method.toUpperCase(),
        statusCode: res.statusCode,
        responseTime: Number(duration.toFixed(2)),
      };
      logQueue.push({ url, apiKey, data: log });
    };

    res.send = function (body) {
      prepareLog();
      return originalSend(body);
    };

    res.json = function (body) {
      prepareLog();
      return originalJson(body);
    };

    next();
  };
};

export default sentinelLogger;
