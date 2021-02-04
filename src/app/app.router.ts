import express from 'express';

const router = express.Router();

router.get('/', (request, response) => {
  response.send({ title: '乐教库', description: '这是乐教库的 Api.' });
});

router.post('/echo', (request, response) => {
  response.status(201).send(request.body);
});

/**
 * 导出路由
 */
export default router;
