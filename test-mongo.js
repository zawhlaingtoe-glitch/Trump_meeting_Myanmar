const mongoose = require('mongoose');
const uri = "mongodb+srv://zawhlaingtoe_db_user:moon@cluster0.a4knqck.mongodb.net/zoom-clone?appName=Cluster0";

console.log("Attempting to connect...");
mongoose.connect(uri)
  .then(() => {
    console.log("✅ SUCCESS! Your connection string is valid!");
    process.exit(0);
  })
  .catch(err => {
    console.log("❌ FAILED! Here is the error:");
    console.log(err.message);
    process.exit(1);
  });
