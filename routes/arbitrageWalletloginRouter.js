const router = require('express').Router();

const { 
        findOrCreateUser, 
        getUser, 
        getAllUser, 
        updateUserProfile, 
        updateUserToken, 
        deleteDataById } = require('../controllers/arbitrageWalletloginController');

const auth = require('../middelware/arbitrageUserAuthMiddleware');

router.post('/', findOrCreateUser);
router.get('/', auth, getUser);
router.get('/all', getAllUser);
router.put('/update/:id', updateUserProfile);
router.put('/updatetoken/:id', updateUserToken);
router.delete('/:id', deleteDataById);


module.exports = router;