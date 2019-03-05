const crypto = require('crypto');
const secret = require('./secret.json');
const algorithm = 'aes-192-ecb';
const password = secret.chatIdEncryption;

let Chat = module.exports = {};

Chat.generateChatId = (id) => {
  return new Promise((res, rej) => {
    // Key length is dependent on the algorithm. In this case for aes192, it is 24 bytes (192 bits).
    crypto.scrypt(password, 'saltsaltsalt', 24, (err, derivedKey) => {
      if (err) return rej(err);
      // console.log(derivedKey);
      const cipher = crypto.createCipheriv(algorithm, derivedKey, null);

      let encrypted = '';
      cipher.on('readable', () => {
        let chunk;
        while (null !== (chunk = cipher.read())) {
          encrypted += chunk.toString('hex');
        }
      });

      cipher.on('end', () => {
        res(encrypted);
      });

      cipher.write(id);
      cipher.end();
    });
  })
}

Chat.getUserFromChatId = (chatId) => {
  return new Promise((res, rej) => {
    crypto.scrypt(password, 'saltsaltsalt', 24, (err, derivedKey) => {
      if (err) return rej(err);
      const decipher = crypto.createDecipheriv(algorithm, derivedKey, null);

      let decrypted = '';
      decipher.on('readable', () => {
        while (null !== (chunk = decipher.read())) {
          decrypted += chunk.toString('utf8');
        }
      });
      decipher.on('end', () => {
        res(decrypted)
      });

      // Encrypted with same algorithm, key and iv.
      // const encrypted = 'e5f79c5915c02171eec6b212d5520d44480993d7d622a7c4c2da32f6efda0ffa';
      decipher.write(chatId, 'hex');
      decipher.end();
    });
  })
}

/* Chat.generateChatId('6001141')
  .then(res => {
    console.log(res);
  })
  .then(res => Chat.getUserFromChatId('87f2c20f7f333c7d0f49f860feaa40bb'))
  .then(res => {
    console.log(res);
  })
  .catch(err => {
    console.log(err);
  }) */