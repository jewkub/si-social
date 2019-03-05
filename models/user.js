let mongoose = require('mongoose');
let bcrypt = require('bcryptjs');

// User Schema
let UserSchema = mongoose.Schema({
  id: Number,
  password: String,
  name: String,
  chatId: String,
}, {
  id: false
});

let User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = async function(newUser, callback){
  let salt = await bcrypt.genSalt(10);
  let hash = await bcrypt.hash(newUser.password, salt);
  newUser.password = hash;
  if(!callback) return newUser.save();
  newUser.save(callback);

  /* bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
      newUser.password = hash;
      if(!callback) return newUser.save();
      newUser.save(callback);
    });
  }); */
}

module.exports.getUserById = function(id, callback){
  let query = {id: id};
  if(!callback) return User.findOne(query).exec();
  User.findOne(query, callback);
}

module.exports.getUserBy_id = function(id, callback){
  if(!callback) return User.findById(id).exec();
  User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
  // let isMatch = await bcrypt.compare(candidatePassword, hash);
  if(!callback) return bcrypt.compare(candidatePassword, hash);
  bcrypt.compare(candidatePassword, hash, callback);
}