import express from 'express';
import * as H5P from '@lumieducation/h5p-server';

// Direct port of @lumieducation/h5p-server's own example REST routes
// (packages/h5p-rest-example-server/src/routes.ts) — play/edit/save/
// delete/list for one content object. This is the shape h5p-react's
// H5PEditorUI/H5PPlayerUI expect their loadContentCallback/
// saveContentCallback to talk to.
export default function contentRoutes(h5pEditor, h5pPlayer) {
  const router = express.Router();

  router.get('/:contentId/play', async (req, res) => {
    try {
      const content = await h5pPlayer.render(
        req.params.contentId.toString(),
        req.user,
        req.language ?? 'en',
      );
      res.status(200).send(content);
    } catch (error) {
      console.error(error);
      res
        .status(error.httpStatusCode ? error.httpStatusCode : 500)
        .send(error.message);
    }
  });

  router.get('/:contentId/edit', async (req, res) => {
    const editorModel = await h5pEditor.render(
      req.params.contentId === 'undefined' ? undefined : req.params.contentId.toString(),
      req.language ?? 'en',
      req.user,
    );
    if (!req.params.contentId || req.params.contentId === 'undefined') {
      res.status(200).send(editorModel);
    } else {
      const content = await h5pEditor.getContent(
        req.params.contentId.toString(),
        req.user,
      );
      res.status(200).send({
        ...editorModel,
        library: content.library,
        metadata: content.params.metadata,
        params: content.params.params,
      });
    }
  });

  router.post('/', async (req, res) => {
    if (
      !req.body.params ||
      !req.body.params.params ||
      !req.body.params.metadata ||
      !req.body.library ||
      !req.user
    ) {
      res.status(400).send('Malformed request');
      return;
    }
    const { id: contentId, metadata } = await h5pEditor.saveOrUpdateContentReturnMetaData(
      undefined,
      req.body.params.params,
      req.body.params.metadata,
      req.body.library,
      req.user,
    );
    res.status(200).json({ contentId, metadata });
  });

  router.patch('/:contentId', async (req, res) => {
    if (
      !req.body.params ||
      !req.body.params.params ||
      !req.body.params.metadata ||
      !req.body.library ||
      !req.user
    ) {
      res.status(400).send('Malformed request');
      return;
    }
    const { id: contentId, metadata } = await h5pEditor.saveOrUpdateContentReturnMetaData(
      req.params.contentId.toString(),
      req.body.params.params,
      req.body.params.metadata,
      req.body.library,
      req.user,
    );
    res.status(200).json({ contentId, metadata });
  });

  router.delete('/:contentId', async (req, res) => {
    try {
      await h5pEditor.deleteContent(req.params.contentId.toString(), req.user);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send(`Error deleting content with id ${req.params.contentId}: ${error.message}`);
    }
    res.status(200).send(`Content ${req.params.contentId} successfully deleted.`);
  });

  router.get('/', async (req, res) => {
    let contentObjects;
    try {
      const contentIds = await h5pEditor.contentManager.listContent(req.user);
      contentObjects = await Promise.all(
        contentIds.map(async (id) => ({
          content: await h5pEditor.contentManager.getContentMetadata(id, req.user),
          id,
        })),
      );
    } catch (error) {
      if (error instanceof H5P.H5pError) {
        return res.status(error.httpStatusCode).send(`${error.message}`);
      }
      return res.status(500).send(`Unknown error: ${error.message}`);
    }
    res.status(200).send(
      contentObjects.map((o) => ({
        contentId: o.id,
        title: o.content.title,
        mainLibrary: o.content.mainLibrary,
      })),
    );
  });

  return router;
}
