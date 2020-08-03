import express from 'express';

const router = express.Router();

router.get('/', (request, response) => {
  response.send({ title: '找乐教' });
});

router.post('/echo', (request, response) => {
  response.status(201).send(request.body);
});

/**
 * 导出路由
 */
export default router;
