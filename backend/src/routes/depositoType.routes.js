const router = require('express').Router();
const depositoTypeController = require('../controllers/depositoType.controller');

router.get('/',       depositoTypeController.getAll);
router.get('/:id',    depositoTypeController.getById);
router.post('/',      depositoTypeController.create);
router.put('/:id',    depositoTypeController.update);
router.delete('/:id', depositoTypeController.delete);

module.exports = router;
