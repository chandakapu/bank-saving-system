const router = require('express').Router();
const accountController = require('../controllers/account.controller');

router.get('/',       accountController.getAll);
router.get('/:id',    accountController.getById);
router.post('/',      accountController.create);
router.put('/:id',    accountController.update);
router.delete('/:id', accountController.delete);

// Deposit & Withdraw
router.post('/:id/deposit',  accountController.deposit);
router.post('/:id/withdraw', accountController.withdraw);

module.exports = router;
