const router = require('express').Router();
const customerController = require('../controllers/customer.controller');

router.get('/',           customerController.getAll);
router.get('/:id',        customerController.getById);
router.post('/',          customerController.create);
router.put('/:id',        customerController.update);
router.delete('/:id',     customerController.delete);

// Nested: GET /customers/:id/accounts
router.get('/:id/accounts', customerController.getAccounts);

module.exports = router;
