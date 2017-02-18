var hfc = require('hfc');
var config = require('config')

var PEER_ADDRESS = config.blockchain.peerAddress;
var MEMBERSRVC_ADDRESS = config.blockchain.memberssvcAddress;
var KEYSTORE_PATH = config.blockchain.keystorePath;
var CHAINCODE_ID  = config.blockchain.chaincodeId;

var chain = hfc.newChain("insurance");

// Configure the KeyValStore which is used to store sensitive keys
// as so it is important to secure this storage.
// The FileKeyValStore is a simple file-based KeyValStore, but you
// can easily implement your own to store whereever you want.
// To work correctly in a cluster, the file-based KeyValStore must
// either be on a shared file system shared by all members of the cluster
// or you must implement you own KeyValStore which all members of the
// cluster can share.
chain.setKeyValStore( hfc.newFileKeyValStore(KEYSTORE_PATH) );

// Set the URL for membership services
chain.setMemberServicesUrl("grpc://" + MEMBERSRVC_ADDRESS);

// Add at least one peer's URL.  If you add multiple peers, it will failover
// to the 2nd if the 1st fails, to the 3rd if both the 1st and 2nd fails, etc.
chain.addPeer("grpc://" + PEER_ADDRESS);

chain.setDevMode(config.blockchain.devMode);

var loginAndInvoke = function(functionName, args, callback) {

  console.log("Enrolling");
  chain.enroll("jim", "6avZQLwcUe9b", function (err, user) {
    if (err) {
      console.error(err);
      console.log("Attemping to get user");

      chain.getUser("jim", function (err, userViaGet) {
        if (err) {
          console.error(err);
          callback(err);
          return;
        }
        invoke(functionName, args, userViaGet, callback);
      });
      return;
    }

    invoke(functionName, args, user, callback);

  });
};

var invoke = function(functionName, args, user, callback) {
  var invokeRequest = {
    // Name (hash) required for invoke
    chaincodeID: CHAINCODE_ID,
    // Function to trigger
    fcn: functionName,
    // Parameters for the invoke function
    args: args
  };

  console.log("Invoke request: " + JSON.stringify(invokeRequest));
  var tx = user.invoke(invokeRequest);

  // Listen for the 'submitted' event
  tx.on('submitted', function(results) {
    callback();
    console.log("submitted invoke: %j",results);
  });
  // Listen for the 'complete' event.
  tx.on('complete', function(results) {
    console.log("completed invoke: %j",results);
  });
  // Listen for the 'error' event.
  tx.on('error', function(err) {
    callback(err)
    console.log("error on invoke: %j",err);
  });
}

module.exports = {
  invoke: function(functionName, args, callback){
    loginAndInvoke(functionName, args, callback);
  }
};
