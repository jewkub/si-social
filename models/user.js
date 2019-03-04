let mongoose = require('mongoose');
let bcrypt = require('bcryptjs');

// User Schema
let UserSchema = mongoose.Schema({
  id: Number,
  password: String,
  name: String,
}, {
  id: false
});

let User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = function(newUser, callback){
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
      newUser.password = hash;
      newUser.save(callback);
    });
  });
}

module.exports.getUserById = function(id, callback){
  let query = {id: id};
  User.findOne(query, callback);
}

module.exports.getUserBy_id = function(id, callback){
  User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
  bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    if(err) throw err;
    callback(null, isMatch);
  });
}