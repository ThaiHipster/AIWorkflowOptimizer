import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useChat } from '@/hooks/use-chat';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function DebugPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeChat, createNewChat, setActiveChat } = useChat();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string>('');

  if (!user || process.env.NODE_ENV === 'production') {
    return null;
  }

  // Create test chat and open it
  const handleCreateTestChat = async () => {
    setIsLoading(true);
    try {
      // Use the debug API endpoint for test chat creation
      const res = await fetch('/api/debug/create-test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, messageCount: 5 }),
      });
      const data = await res.json();
      if (data.success && data.chat) {
        toast({
          title: 'Test chat created',
          description: `Created chat: ${data.chat.title}`,
        });
        // Add to chat list and open
        setActiveChat(data.chat);
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

  // Set selected phase for the current chat
  const handleTestPhase = async (phaseValue: string) => {
    if (!activeChat) {
      // Do nothing if no active chat
      return;
    }
    // Only allow phase progression if previous phase is selected
    const phaseNum = Number(phaseValue);
    if (phaseNum > 1 && activeChat.phase !== phaseNum - 1) {
      toast({
        title: 'Invalid phase progression',
        description: 'You must select a chat in the previous phase before testing this phase.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/set-chat-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChat.id, phase: phaseNum }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: `Phase ${phaseValue} set`,
          description: `Chat set to phase ${phaseValue}`,
        });
      } else {
        toast({
          title: `Error setting phase ${phaseValue}`,
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error setting phase',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle panel visibility
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsExpanded(true)}
          variant="secondary"
          size="sm"
        >
          Debug Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-4 shadow-lg w-80">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Debug Panel</h3>
          <Button 
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </div>
        {/* Current Chat Display */}
        <div className="mb-4">
          <span className="block text-sm font-medium text-muted-foreground">
            Current Selected Chat: {activeChat ? activeChat.title : 'None'}
          </span>
        </div>
        {/* New Test Chat Button */}
        <Button 
          onClick={handleCreateTestChat}
          disabled={isLoading}
          className="w-full mb-4"
        >
          New Test Chat
        </Button>
        {/* Phase Selector and Test Button Row */}
        <div className="flex flex-row items-center mb-4 gap-4">
          <div className="flex flex-col flex-1">
            <span className="text-xs text-muted-foreground mb-2">Phase to test</span>
            <RadioGroup
              value={selectedPhase}
              onValueChange={val => setSelectedPhase(val)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="phase1" />
                <Label htmlFor="phase1">Phase 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="phase2" />
                <Label htmlFor="phase2">Phase 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="phase3" />
                <Label htmlFor="phase3">Phase 3</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex flex-col justify-center">
            <Button
              onClick={() => handleTestPhase(selectedPhase)}
              disabled={isLoading || !activeChat || !selectedPhase}
              className="w-20"
            >
              Test
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}