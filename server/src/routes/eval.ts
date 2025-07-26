import express from 'express';
import OpenAI from 'openai';
import { verifyToken } from '../services/auth';
import { db, EvalResult } from '../services/dynamodb';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

// Middleware to verify authentication
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Allow mock token for development/testing
    if (token === 'mock-token') {
      (req as any).user = {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };
      return next();
    }

    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.log('Token verification failed:', error);
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

    // Store result in DynamoDB
    try {
      await db.createEvalResult(evalResult);
      console.log('=== COMPARISON COMPLETED & SAVED ===');
      console.log('ID:', evalResult.id);
      console.log('User:', userId);
      console.log('Message:', userMessage);
      console.log('Response A Length:', resultA.response.length, 'chars');
      console.log('Response B Length:', resultB.response.length, 'chars');
      console.log('Latency A vs B:', resultA.latency + 'ms vs ' + resultB.latency + 'ms');
      console.log('Tokens A vs B:', resultA.tokens + ' vs ' + resultB.tokens);
      console.log('Saved to DynamoDB: EvalResults table');
      console.log('====================================');
    } catch (dbError) {
      console.error('Failed to save to DynamoDB, continuing with response:', dbError);
    }

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

    // Update rating in DynamoDB
    try {
      await db.updateEvalResultRating(resultId, rating);
      
      // Enhanced logging for visibility
      console.log('=== RATING LOGGED TO DYNAMODB ===');
      console.log('Result ID:', resultId);
      console.log('User ID:', userId);
      console.log('Rating:', rating);
      console.log('Updated in DynamoDB: EvalResults table');
      console.log('==================================');

      res.json({ success: true, rating });
    } catch (dbError: any) {
      console.error('Failed to update rating in DynamoDB:', dbError.message);
      res.status(500).json({ error: 'Failed to save rating' });
    }
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// GET /api/eval/results - Get user's eval results
router.get('/results', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const userResults = await db.getUserEvalResults(userId);
    const sortedResults = userResults.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`Fetching results for user ${userId}: ${sortedResults.length} results found from DynamoDB`);
    res.json({ results: sortedResults });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// GET /api/eval/debug - Debug endpoint to see all stored results (for development)
router.get('/debug', async (req, res) => {
  try {
    const allResults = await db.getAllEvalResults();
    const sortedResults = allResults.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log('=== DEBUG: ALL EVAL RESULTS FROM DYNAMODB ===');
    console.log('Total results stored:', sortedResults.length);
    
    sortedResults.forEach((result, index) => {
      console.log(`${index + 1}. ID: ${result.id}`);
      console.log(`   User: ${result.userId}`);
      console.log(`   Message: ${result.userMessage}`);
      console.log(`   Rating: ${result.rating || 'Not rated'}`);
      console.log(`   Latency: A=${result.latencyA}ms, B=${result.latencyB}ms`);
      console.log(`   Tokens: A=${result.tokensA}, B=${result.tokensB}`);
      console.log(`   Time: ${result.timestamp}`);
      console.log('   ---');
    });
    console.log('============================================');

    res.json({ 
      total: sortedResults.length,
      source: 'DynamoDB',
      results: sortedResults.map(r => ({
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