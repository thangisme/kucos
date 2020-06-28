const Comment = require('../models/comment.model');
const Stats = require('../models/stats.model');
const Spam = require('../models/spam.model');
const config = require('../config');
const fc = require('./../helpers/functions');
const title = 'Kucos - Open source Comments and Kudos server';

module.exports = {

    overview: function(req, res) {
        Stats.find().exec(function(err, data) {
            return res.status(200).render('overview', {
                title: title, panel: 'Overview', data: data, isLoggedIn: req.session.admin?true:false
            });
        });
    },

    comments: function(req, res) {
        Comment.find({article_id: req.query.url}).exec(function(err, data) {
            Spam.find().exec(function(err, spam) {
                return res.status(200).render('comments', {
                    title: title, panel: 'Article comments', commets: data, spamComment: spam, isLoggedIn: req.session.admin?true:false, kucosUrl: config.kucosServerUrl
                });
            });
        });
    },

    spam: function(req, res) {
        Spam.find().exec(function(err, spam) {
            var spams = []
            spam.map(d => {
                spams.push(d.comment_id)
            });
            Comment.find().where('_id').in(spams).exec((err, data) => {
                return res.status(200).render('spam', {
                    title: title, panel: 'Possible spam comments', spamComment: data, isLoggedIn: req.session.admin?true:false, kucosUrl: config.kucosServerUrl
                });
            });
        });
    },

    removeComment: function(req, res) {
        Stats.findOne({article_id: req.query.url}, function(err, article) {
            article.totalComments = article.totalComments - 1;
            if (req.query.spam == 1) {
                article.totalSpam = article.totalSpam - 1;
            }
            article.save(function(err) {
                if (err) console.log(err)
            });
        });
        Comment.remove({ _id: req.params.id }, function(err) {
            if (err) console.log(err)
            else res.json({message: 'Comment deleted'});
        });
        return;
    },

    notspam: function(req, res) {
        Spam.remove({ comment_id: req.params.id }, function(err) {
            if (err) console.log(err)
        });
        if (config.enableAkismet) {
            Comment.find({_id: req.params.id}).exec(async function(err, data) {
                await fc.checkCommentSpam(req, res, data, 'submitHam', req.params.id);
            });
        }
        return;
    },

    reportSpam: function(req, res) {
        Comment.findOne({_id: req.params.id}).exec(async function(err, data) {
            Spam.create({ comment_id: data._id });
            if (config.enableAkismet) {
                await fc.checkCommentSpam(req, res, data, 'submitSpam', req.params.id);
            }
        });
        return;
    }


}
