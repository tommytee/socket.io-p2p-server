var clients = {}

module.exports.clients = clients
module.exports.Server = p2pSocket

function p2pSocket (socket, next, room) {

  var connectedClients;

  clients[socket.id] = socket

  if (typeof room === 'object')
    connectedClients = socket.adapter.rooms[room.name].sockets

  else
    connectedClients = clients

  var useSockets = false;

  Object.keys( connectedClients ).forEach( function ( clientId ) {

    if ( clients[ clientId ].noRTC && clientId !== socket.id )
      useSockets = true;

  })

  socket.emit('numClients', {
    useSockets: useSockets,
    numClients: Object.keys(connectedClients).length - 1
  })

  // - - - - - - - - - - - -
  socket.on('offers', function (data) {

    // send offers to everyone in a given room
    Object.keys(connectedClients).forEach(function (clientId, i) {

      var client = clients[clientId]

      if (client !== socket) {

        var offerObj = data.offers[i]

        var emittedOffer = {
          fromPeerId: socket.id,
          offerId: offerObj.offerId,
          offer: offerObj.offer
        }

        //console.log('Emitting offer: %s', JSON.stringify(emittedOffer))
        client.emit('offer', emittedOffer)
      }

    })

  })

  // - - - - - - - - - - - -
  socket.on('peer-signal', function (data) {
    var toPeerId = data.toPeerId
    //console.log('Signal peer id %s', toPeerId);

    var client = clients[toPeerId]
    client.emit('peer-signal', data)
  })

  // - - - - - - - - - - - -
  socket.on('disconnect', function () {

    if ( clients[ socket.id ].noRTC ) {

      var useSockets = false;

      Object.keys( connectedClients ).forEach( function ( clientId ) {

        if ( clients[ clientId ].noRTC && clientId !== socket.id )
          useSockets = true;

      })

      Object.keys( connectedClients ).forEach( function ( clientId ) {

        if ( clientId !== socket.id )
          clients[ clientId ].emit( 'useSockets', useSockets )

      })
    }

    delete clients[ socket.id ]

    Object.keys( connectedClients ).forEach( function ( clientId ) {

      var client = clients[ clientId ]

      client.emit( 'peer-disconnect', socket.id )

    } )

    console.log( 'client left (id=' + socket.id + ').' )
  })

  // - - - - - - - - - - - -
  socket.on('noRTC', function () {

    socket.noRTC = true;

    Object.keys( connectedClients ).forEach( function ( clientId ) {

      if ( clientId !== socket.id )
        clients[ clientId ].emit( 'useSockets', true )

    })
  })

  // - - - - - - - - - - - -
  socket.on('forAll', function (data) {

    Object.keys( connectedClients ).forEach( function ( clientId ) {

      if ( clientId !== socket.id )
        clients[ clientId ].emit( data.name, data.msg )

    })
  })

  // - - - - - - - - - - - -
  socket.on('forPeerless', function (data) {

    Object.keys( connectedClients ).forEach( function ( clientId ) {

      if ( clients[ clientId ].noRTC && clientId !== socket.id )
        clients[ clientId ].emit( data.name, data.msg )

    })
  })

  typeof next === 'function' && next()

}
