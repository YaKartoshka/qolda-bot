const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
        return res.redirect('login'); // redirect to sign-in route
    }
    next();
};

router.get('/', (req, res, next) => {
    res.render('index');
});

router.get('/login', (req, res) => {
    res.render('login');
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