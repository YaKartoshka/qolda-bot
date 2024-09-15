const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
        return res.redirect('login'); // redirect to sign-in route
    }
    next();
};

router.get('/', isAuthenticated, (req, res, next) => {
    res.render('index', {user_id: req.session.user_id});
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/shop',isAuthenticated, (req, res) => {
    res.render('shop');
});

router.get('/register', (req, res) => {
    res.render('register');
});




router.post('/', (req,res)=>{
    var r = {r:0};
    var action = req.body.action;
    
    if(action == 'changeLanguage'){
        const language = req.body.language;
        res.cookie("language", language);
        r['r'] = 1;
        res.send(JSON.stringify(r));
    }
});


module.exports = router;