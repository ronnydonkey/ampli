const express = require('express');
const router = express.Router();

module.exports = (supabase, authMiddleware) => {
  // Get all content for the user
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          platform_posts (*)
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ content: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single content item
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          platform_posts (*)
        `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Content not found' });
      }

      res.json({ content: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create new content
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { title, originalContent, contentType = 'post' } = req.body;

      if (!originalContent) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const { data, error } = await supabase
        .from('content')
        .insert({
          user_id: req.user.id,
          title,
          original_content: originalContent,
          content_type: contentType,
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({ content: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update content
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { title, originalContent, status } = req.body;
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (originalContent !== undefined) updates.original_content = originalContent;
      if (status !== undefined) updates.status = status;

      const { data, error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Content not found' });
      }

      res.json({ content: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete content
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Content deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get platform posts for content
  router.get('/:id/platforms', authMiddleware, async (req, res) => {
    try {
      // First verify the user owns this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('id')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      const { data, error } = await supabase
        .from('platform_posts')
        .select('*')
        .eq('content_id', req.params.id)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ platformPosts: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};