import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, Clock, Hash, Zap, Send, ArrowLeft } from 'lucide-react';

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
}

const EvalHarness: React.FC = () => {
  const navigate = useNavigate();
  const [userMessage, setUserMessage] = useState('');
  const [promptA, setPromptA] = useState('You are a helpful assistant.');
  const [promptB, setPromptB] = useState('You are a creative and detailed assistant.');
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<EvalResult | null>(null);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Function to load comparison history
  const loadHistory = async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/eval/results`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'mock-token'}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        console.log('Loaded comparison history:', data.results?.length || 0, 'results');
      } else {
        console.log('Failed to load comparison history, using empty state');
      }
    } catch (error) {
      console.error('Error loading comparison history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load comparison history on component mount
  React.useEffect(() => {
    loadHistory();
  }, []);

  const runComparison = async () => {
    if (!userMessage.trim()) return;
    
    setIsRunning(true);
    setCurrentResult(null);

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/eval/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'mock-token'}`,
        },
        body: JSON.stringify({
          userMessage,
          promptA,
          promptB,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentResult(result);
        console.log('New comparison completed:', result.id);
        
        // Reload history from database to ensure we have the latest data
        setTimeout(() => {
          loadHistory();
        }, 500); // Small delay to ensure server has processed the save
      } else {
        // Fallback to mock data
        const mockResult: EvalResult = {
          id: Date.now().toString(),
          promptA,
          promptB,
          userMessage,
          responseA: `Response A: ${userMessage} - This is a mock response from prompt A.`,
          responseB: `Response B: ${userMessage} - This is a mock response from prompt B with more detail.`,
          latencyA: Math.floor(Math.random() * 2000) + 500,
          latencyB: Math.floor(Math.random() * 2000) + 500,
          tokensA: Math.floor(Math.random() * 100) + 20,
          tokensB: Math.floor(Math.random() * 120) + 25,
          timestamp: new Date().toISOString(),
        };
        setCurrentResult(mockResult);
        // For mock results, add to local state since they won't be in database
        setResults(prev => [mockResult, ...prev]);
        console.log('Mock comparison added to local state:', mockResult.id);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
      // Fallback to mock data
      const mockResult: EvalResult = {
        id: Date.now().toString(),
        promptA,
        promptB,
        userMessage,
        responseA: `Response A: ${userMessage} - This is a mock response from prompt A.`,
        responseB: `Response B: ${userMessage} - This is a mock response from prompt B with more detail.`,
        latencyA: Math.floor(Math.random() * 2000) + 500,
        latencyB: Math.floor(Math.random() * 2000) + 500,
        tokensA: Math.floor(Math.random() * 100) + 20,
        tokensB: Math.floor(Math.random() * 120) + 25,
        timestamp: new Date().toISOString(),
      };
      setCurrentResult(mockResult);
      // For error fallback, add to local state since they won't be in database
      setResults(prev => [mockResult, ...prev]);
      console.log('Error fallback comparison added to local state:', mockResult.id);
    } finally {
      setIsRunning(false);
    }
  };

  const rateResponse = async (resultId: string, rating: 'A' | 'B') => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      await fetch(`${serverUrl}/api/eval/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'mock-token'}`,
        },
        body: JSON.stringify({ resultId, rating }),
      });
    } catch (error) {
      console.log('Rating failed, using local state');
    }

    // Update local state
    setResults(prev => prev.map(result => 
      result.id === resultId ? { ...result, rating } : result
    ));
    
    if (currentResult?.id === resultId) {
      setCurrentResult(prev => prev ? { ...prev, rating } : null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate('/chat')}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chat
        </Button>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">LLM Eval Harness</h1>
          <p className="text-muted-foreground">
            Compare two prompts/models on the same user message
          </p>
        </div>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="user-message" className="block text-sm font-medium mb-2">User Message</label>
            <Textarea
              id="user-message"
              placeholder="Enter the message to test both prompts with..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prompt-a" className="block text-sm font-medium mb-2">Prompt A</label>
              <Textarea
                id="prompt-a"
                placeholder="Enter first prompt..."
                value={promptA}
                onChange={(e) => setPromptA(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label htmlFor="prompt-b" className="block text-sm font-medium mb-2">Prompt B</label>
              <Textarea
                id="prompt-b"
                placeholder="Enter second prompt..."
                value={promptB}
                onChange={(e) => setPromptB(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <Button 
            onClick={runComparison} 
            disabled={isRunning || !userMessage.trim()}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Running Comparison...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Run Comparison
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Result */}
      {currentResult && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Comparison Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User Message:</label>
                <p className="text-sm text-muted-foreground">{currentResult.userMessage}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Response A */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Response A</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          {currentResult.latencyA}ms
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                          <Hash className="w-3 h-3 mr-1 inline" />
                          {currentResult.tokensA} tokens
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prompt: {currentResult.promptA}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{currentResult.responseA}</p>
                    <Separator className="my-3" />
                    <Button
                      variant={currentResult.rating === 'A' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => rateResponse(currentResult.id, 'A')}
                      className="w-full"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Better Response
                    </Button>
                  </CardContent>
                </Card>

                {/* Response B */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Response B</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          {currentResult.latencyB}ms
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                          <Hash className="w-3 h-3 mr-1 inline" />
                          {currentResult.tokensB} tokens
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prompt: {currentResult.promptB}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{currentResult.responseB}</p>
                    <Separator className="my-3" />
                    <Button
                      variant={currentResult.rating === 'B' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => rateResponse(currentResult.id, 'B')}
                      className="w-full"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Better Response
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Complete Comparison History 
            {loadingHistory ? (
              <span className="text-sm font-normal text-muted-foreground ml-2">Loading...</span>
            ) : (
              <span className="text-sm font-normal text-muted-foreground ml-2">({results.length} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No comparisons yet. Run your first comparison above!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{result.userMessage}</p>
                    <div className="flex items-center space-x-2">
                      {result.rating && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {result.rating === 'A' ? 'A Won' : 'B Won'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>A: {result.latencyA}ms, {result.tokensA} tokens</div>
                    <div>B: {result.latencyB}ms, {result.tokensB} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EvalHarness;