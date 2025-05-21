import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export function DebugPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatId, setChatId] = useState('');
  const [messageCount, setMessageCount] = useState('5');
  const [phase, setPhase] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTestChat = async () => {
    if (!user) {
      toast({
        title: 'User required',
        description: 'You need to be logged in to create a test chat',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/debug/create-test-chat', {
        userId: user.id,
        messageCount: parseInt(messageCount)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Test chat created',
          description: `Created chat ID: ${data.chat.id}`,
        });
        setChatId(data.chat.id);
      } else {
        toast({
          title: 'Error creating test chat',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error creating test chat',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetChatPhase = async () => {
    if (!chatId) {
      toast({
        title: 'Chat ID required',
        description: 'Please enter a chat ID or create a test chat first',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/debug/set-chat-phase', {
        chatId,
        phase: parseInt(phase)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Chat phase updated',
          description: `Chat phase set to ${phase}`,
        });
      } else {
        toast({
          title: 'Error setting chat phase',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error setting chat phase',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetWorkflowJson = async () => {
    if (!chatId) {
      toast({
        title: 'Chat ID required',
        description: 'Please enter a chat ID or create a test chat first',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/debug/set-workflow-json', {
        chatId
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Workflow JSON set',
          description: 'Sample workflow JSON has been set for this chat',
        });
      } else {
        toast({
          title: 'Error setting workflow JSON',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error setting workflow JSON',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompletedChat = async () => {
    if (!user) {
      toast({
        title: 'User required',
        description: 'You need to be logged in to create a completed chat',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/debug/create-completed-chat', {
        userId: user.id
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Completed test chat created',
          description: `Created completed chat ID: ${data.chat.id}`,
        });
        setChatId(data.chat.id);
      } else {
        toast({
          title: 'Error creating completed chat',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error creating completed chat',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button 
          onClick={() => setIsExpanded(true)}
          variant="secondary"
          size="sm"
          className="shadow-lg border border-gray-300 bg-opacity-90 backdrop-blur-sm"
        >
          Developer Tools
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <Card className="p-4 shadow-lg w-80 border-2 border-primary-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Developer Debug Tools</h3>
          <Button 
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter chat ID or create test chat"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="messageCount">Message Count</Label>
              <Select
                value={messageCount}
                onValueChange={setMessageCount}
              >
                <SelectTrigger id="messageCount">
                  <SelectValue placeholder="Message count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 (Minimum for title)</SelectItem>
                  <SelectItem value="5">5 (Small sample)</SelectItem>
                  <SelectItem value="9">9 (Full workflow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="phase">Phase</Label>
              <Select
                value={phase}
                onValueChange={setPhase}
              >
                <SelectTrigger id="phase">
                  <SelectValue placeholder="Phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Phase 1 (Discovery)</SelectItem>
                  <SelectItem value="2">Phase 2 (Diagram)</SelectItem>
                  <SelectItem value="3">Phase 3 (AI Suggestions)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleCreateTestChat}
              disabled={isLoading}
              size="sm"
            >
              Create Test Chat
            </Button>
            
            <Button 
              onClick={handleSetChatPhase}
              disabled={isLoading || !chatId}
              size="sm"
            >
              Set Chat Phase
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleSetWorkflowJson}
              disabled={isLoading || !chatId}
              size="sm"
            >
              Set Workflow JSON
            </Button>
            
            <Button 
              onClick={handleCreateCompletedChat}
              disabled={isLoading}
              variant="secondary"
              size="sm"
            >
              Create Complete Chat
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}