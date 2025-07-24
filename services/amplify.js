let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (error) {
  console.error('Failed to load Anthropic SDK:', error.message);
}

class BranchOutService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    console.log('Initializing Anthropic with API key:', apiKey ? 'Present' : 'Missing');
    this.anthropic = new Anthropic({ apiKey });
  }

  async amplifyContent(originalContent, platforms, options = {}) {
    const { tone = 'professional', style = 'engaging' } = options;
    
    const platformPrompts = {
      instagram: `Create an Instagram-optimized version of this content:
- Keep it visual and engaging
- Use relevant emojis sparingly
- Include 5-10 relevant hashtags at the end
- Maximum 2200 characters
- Focus on visual storytelling`,
      
      linkedin: `Create a LinkedIn-optimized version of this content:
- Professional tone
- Focus on value and insights
- Include a call-to-action
- Maximum 3000 characters
- Use professional language`,
      
      twitter: `Create a Twitter/X-optimized version of this content:
- Concise and punchy
- Maximum 280 characters (or create a thread if needed)
- Use 1-3 relevant hashtags
- Make it shareable and engaging`,
      
      facebook: `Create a Facebook-optimized version of this content:
- Conversational tone
- Encourage engagement and discussion
- Include a question or call-to-action
- Can be longer form but keep it engaging`
    };

    const results = {};

    for (const platform of platforms) {
      if (!platformPrompts[platform]) {
        continue;
      }

      try {
        const message = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `${platformPrompts[platform]}

Original content:
"${originalContent}"

Tone: ${tone}
Style: ${style}

Please provide only the adapted content without any explanations or meta-commentary.`
          }]
        });

        results[platform] = {
          adaptedContent: message.content[0].text.trim(),
          platform: platform,
          status: 'success'
        };
      } catch (error) {
        console.error(`Error amplifying for ${platform}:`, error);
        results[platform] = {
          adaptedContent: null,
          platform: platform,
          status: 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  async generateHashtags(content, platform, count = 10) {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Generate ${count} relevant hashtags for this ${platform} post:
"${content}"

Provide only the hashtags, separated by spaces, without the # symbol.`
        }]
      });

      const hashtags = message.content[0].text.trim().split(' ');
      return hashtags.map(tag => `#${tag.toLowerCase()}`);
    } catch (error) {
      throw new Error(`Failed to generate hashtags: ${error.message}`);
    }
  }

  async improveContent(content, feedback) {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Improve this social media content based on the feedback:

Original content:
"${content}"

Feedback:
"${feedback}"

Provide only the improved content without explanations.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      throw new Error(`Failed to improve content: ${error.message}`);
    }
  }

  async analyzeTone(content) {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Analyze the tone of this social media content and provide a brief assessment:

"${content}"

Provide a JSON response with:
{
  "tone": "primary tone (professional/casual/friendly/urgent/etc)",
  "sentiment": "positive/negative/neutral",
  "engagementLevel": "high/medium/low",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`
        }]
      });

      return JSON.parse(message.content[0].text.trim());
    } catch (error) {
      throw new Error(`Failed to analyze tone: ${error.message}`);
    }
  }
}

module.exports = BranchOutService;