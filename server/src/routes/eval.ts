import express from 'express';
import OpenAI from 'openai';
import { verifyToken } from '../services/auth';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

interface EvalResult {
  id: string;
  promptA: string;
  promptB: string;
  userMessage: string;
  responseA: string;
  responseB: string;
  latencyA: number;
  latencyB: number;
  tokensA: number;
  tokensB: number;
  rating?: 'A' | 'B' | null;
  timestamp: string;
  userId: string;
}

// In-memory storage for eval results (in production, use DynamoDB)
const evalResults: Map<string, EvalResult> = new Map();

// Middleware to verify authentication
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function to make OpenAI request with timing
async function makeOpenAIRequest(prompt: string, userMessage: string): Promise<{
  response: string;
  latency: number;
  tokens: number;
}> {
  const startTime = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 200,
    });

    const endTime = Date.now();
    const latency = endTime - startTime;
    const response = completion.choices[0]?.message?.content || 'No response';
    const tokens = completion.usage?.total_tokens || 0;

    return { response, latency, tokens };
  } catch (error) {
    console.error('OpenAI request failed:', error);
    // Return mock data if OpenAI fails
    const endTime = Date.now();
    const latency = endTime - startTime;
    return {
      response: `Mock response for: "${userMessage}" with prompt: "${prompt.substring(0, 50)}..."`,
      latency,
      tokens: Math.floor(Math.random() * 100) + 20
    };
  }
}

// POST /api/eval/compare - Run comparison between two prompts
router.post('/compare', requireAuth, async (req, res) => {
  try {
    const { userMessage, promptA, promptB } = req.body;
    const userId = (req as any).user.id;

    if (!userMessage || !promptA || !promptB) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Running eval comparison for user:', userId);

    // Run both prompts in parallel
    const [resultA, resultB] = await Promise.all([
      makeOpenAIRequest(promptA, userMessage),
      makeOpenAIRequest(promptB, userMessage)
    ]);

    const evalResult: EvalResult = {
      id: Date.now().toString(),
      promptA,
      promptB,
      userMessage,
      responseA: resultA.response,
      responseB: resultB.response,
      latencyA: resultA.latency,
      latencyB: resultB.latency,
      tokensA: resultA.tokens,
      tokensB: resultB.tokens,
      timestamp: new Date().toISOString(),
      userId,
    };

    // Store result
    evalResults.set(evalResult.id, evalResult);

    console.log('=== COMPARISON COMPLETED ===');
    console.log('ID:', evalResult.id);
    console.log('User:', userId);
    console.log('Message:', userMessage);
    console.log('Response A Length:', resultA.response.length, 'chars');
    console.log('Response B Length:', resultB.response.length, 'chars');
    console.log('Latency A vs B:', resultA.latency + 'ms vs ' + resultB.latency + 'ms');
    console.log('Tokens A vs B:', resultA.tokens + ' vs ' + resultB.tokens);
    console.log('============================');

    res.json(evalResult);
  } catch (error) {
    console.error('Eval comparison error:', error);
    res.status(500).json({ error: 'Failed to run comparison' });
  }
});

// POST /api/eval/rate - Rate a comparison result
router.post('/rate', requireAuth, async (req, res) => {
  try {
    const { resultId, rating } = req.body;
    const userId = (req as any).user.id;

    if (!resultId || !rating || !['A', 'B'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }

    const result = evalResults.get(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (result.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to rate this result' });
    }

    // Update rating
    result.rating = rating;
    evalResults.set(resultId, result);

    // Enhanced logging for visibility
    console.log('=== RATING LOGGED ===');
    console.log('Result ID:', resultId);
    console.log('User ID:', userId);
    console.log('Rating:', rating);
    console.log('User Message:', result.userMessage);
    console.log('Prompt A:', result.promptA.substring(0, 50) + '...');
    console.log('Prompt B:', result.promptB.substring(0, 50) + '...');
    console.log('Latency A vs B:', result.latencyA + 'ms vs ' + result.latencyB + 'ms');
    console.log('Tokens A vs B:', result.tokensA + ' vs ' + result.tokensB);
    console.log('Total stored results:', evalResults.size);
    console.log('====================');

    res.json({ success: true, rating });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// GET /api/eval/results - Get user's eval results
router.get('/results', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const userResults = Array.from(evalResults.values())
      .filter(result => result.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`Fetching results for user ${userId}: ${userResults.length} results found`);
    res.json({ results: userResults });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// GET /api/eval/debug - Debug endpoint to see all stored results (for development)
router.get('/debug', async (req, res) => {
  try {
    const allResults = Array.from(evalResults.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log('=== DEBUG: ALL EVAL RESULTS ===');
    console.log('Total results stored:', allResults.length);
    
    allResults.forEach((result, index) => {
      console.log(`${index + 1}. ID: ${result.id}`);
      console.log(`   User: ${result.userId}`);
      console.log(`   Message: ${result.userMessage}`);
      console.log(`   Rating: ${result.rating || 'Not rated'}`);
      console.log(`   Latency: A=${result.latencyA}ms, B=${result.latencyB}ms`);
      console.log(`   Tokens: A=${result.tokensA}, B=${result.tokensB}`);
      console.log(`   Time: ${result.timestamp}`);
      console.log('   ---');
    });
    console.log('===============================');

    res.json({ 
      total: allResults.length,
      results: allResults.map(r => ({
        id: r.id,
        userId: r.userId,
        userMessage: r.userMessage,
        rating: r.rating,
        latencyA: r.latencyA,
        latencyB: r.latencyB,
        tokensA: r.tokensA,
        tokensB: r.tokensB,
        timestamp: r.timestamp
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

export default router;