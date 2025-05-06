import fetch from 'node-fetch';

// Check for required environment variables
if (!process.env.SEARCH_API_KEY) {
  console.warn('SEARCH_API_KEY is not set. Web search functionality will be limited.');
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export class WebSearch {
  private readonly apiKey: string;
  private readonly searchEngine: 'serper' | 'google';

  constructor() {
    this.apiKey = process.env.SEARCH_API_KEY || '';
    // Determine which search API to use based on environment variables
    this.searchEngine = process.env.SEARCH_ENGINE === 'google' ? 'google' : 'serper';
  }

  async search(query: string): Promise<SearchResponse> {
    // If no API key is provided, return a mock response with a warning
    if (!this.apiKey) {
      return {
        results: [
          {
            title: "Search API Key Not Configured",
            link: "https://example.com",
            snippet: "Web search is currently unavailable as the Search API key is not configured. Please set the SEARCH_API_KEY environment variable."
          }
        ]
      };
    }

    try {
      if (this.searchEngine === 'google') {
        return await this.googleSearch(query);
      } else {
        return await this.serperSearch(query);
      }
    } catch (error) {
      console.error('Error performing web search:', error);
      return { results: [] };
    }
  }

  private async googleSearch(query: string): Promise<SearchResponse> {
    try {
      // Google Custom Search API
      const cx = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      // Transform Google's response format to our standard format
      const results: SearchResult[] = data.items?.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || ''
      })) || [];
      
      return { results };
    } catch (error) {
      console.error('Error in Google search:', error);
      return { results: [] };
    }
  }

  private async serperSearch(query: string): Promise<SearchResponse> {
    try {
      // Serper API
      const url = 'https://google.serper.dev/search';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: 10
        })
      });
      
      if (!response.ok) {
        throw new Error(`Serper API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      // Transform Serper's response format to our standard format
      const results: SearchResult[] = data.organic?.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || ''
      })) || [];
      
      return { results };
    } catch (error) {
      console.error('Error in Serper search:', error);
      return { results: [] };
    }
  }
}
