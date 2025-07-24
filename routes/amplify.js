const express = require('express');
const router = express.Router();
const BranchOutService = require('../services/amplify');

module.exports = (supabase, authMiddleware) => {
  // Initialize BranchOutService
  let branchOutService;
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('WARNING: ANTHROPIC_API_KEY not found in environment variables');
    }
    branchOutService = new BranchOutService(process.env.ANTHROPIC_API_KEY);
  } catch (error) {
    console.error('ERROR: Failed to initialize BranchOutService:', error.message);
    // Create a dummy service that returns errors
    branchOutService = {
      amplifyContent: async () => ({ error: 'Anthropic API not configured' }),
      generateHashtags: async () => { throw new Error('Anthropic API not configured'); },
      improveContent: async () => { throw new Error('Anthropic API not configured'); },
      analyzeTone: async () => { throw new Error('Anthropic API not configured'); }
    };
  }

  // Amplify content for multiple platforms
  router.post('/:contentId/amplify', authMiddleware, async (req, res) => {
    try {
      const { platforms, tone, style } = req.body;
      
      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: 'Platforms array is required' });
      }

      // Verify user owns this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', req.params.contentId)
        .eq('user_id', req.user.id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      // Get user's platform settings
      const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('user_id', req.user.id)
        .in('platform', platforms);

      const activePlatforms = platforms.filter(platform => {
        const setting = platformSettings?.find(s => s.platform === platform);
        return !setting || setting.is_active !== false;
      });

      if (activePlatforms.length === 0) {
        return res.status(400).json({ error: 'No active platforms selected' });
      }

      // Amplify content
      const amplifiedResults = await branchOutService.amplifyContent(
        content.original_content,
        activePlatforms,
        { tone, style }
      );

      // Save platform posts
      const platformPosts = [];
      for (const [platform, result] of Object.entries(amplifiedResults)) {
        if (result.status === 'success') {
          const { data: post, error: postError } = await supabase
            .from('platform_posts')
            .insert({
              content_id: content.id,
              platform: platform,
              adapted_content: result.adaptedContent,
              status: 'pending'
            })
            .select()
            .single();

          if (!postError && post) {
            platformPosts.push(post);
          }
        }
      }

      res.json({ 
        amplifiedContent: amplifiedResults,
        platformPosts: platformPosts 
      });
    } catch (error) {
      console.error('Amplify error:', error);
      res.status(500).json({ 
        error: 'Failed to amplify content',
        details: error.message 
      });
    }
  });

  // Generate hashtags for content
  router.post('/:contentId/hashtags', authMiddleware, async (req, res) => {
    try {
      const { platform = 'instagram', count = 10 } = req.body;

      // Verify user owns this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', req.params.contentId)
        .eq('user_id', req.user.id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      const hashtags = await branchOutService.generateHashtags(
        content.original_content,
        platform,
        count
      );

      res.json({ hashtags });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate hashtags' });
    }
  });

  // Improve content based on feedback
  router.post('/:contentId/improve', authMiddleware, async (req, res) => {
    try {
      const { feedback } = req.body;

      if (!feedback) {
        return res.status(400).json({ error: 'Feedback is required' });
      }

      // Verify user owns this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', req.params.contentId)
        .eq('user_id', req.user.id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      const improvedContent = await branchOutService.improveContent(
        content.original_content,
        feedback
      );

      res.json({ improvedContent });
    } catch (error) {
      res.status(500).json({ error: 'Failed to improve content' });
    }
  });

  // Analyze content tone
  router.get('/:contentId/analyze', authMiddleware, async (req, res) => {
    try {
      // Verify user owns this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', req.params.contentId)
        .eq('user_id', req.user.id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      const analysis = await branchOutService.analyzeTone(content.original_content);

      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze content' });
    }
  });

  // Update platform post
  router.put('/platform-posts/:postId', authMiddleware, async (req, res) => {
    try {
      const { adaptedContent, status } = req.body;

      // Verify user owns this platform post through content ownership
      const { data: post, error: postError } = await supabase
        .from('platform_posts')
        .select(`
          *,
          content!inner(user_id)
        `)
        .eq('id', req.params.postId)
        .single();

      if (postError || !post || post.content.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Platform post not found' });
      }

      const updates = {};
      if (adaptedContent !== undefined) updates.adapted_content = adaptedContent;
      if (status !== undefined) updates.status = status;

      const { data: updatedPost, error: updateError } = await supabase
        .from('platform_posts')
        .update(updates)
        .eq('id', req.params.postId)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json({ platformPost: updatedPost });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update platform post' });
    }
  });

  return router;
};