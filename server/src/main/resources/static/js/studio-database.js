var editor = null;
var globalTableResult = null;
var globalGraphResult = null;
var globalGraphMaxResult = 1000;
var globalCredentials = null;

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return "Basic " + hash;
}

function login(){
  var userName = escapeHtml( $("#inputUserName").val().trim() );
  if( userName.length == 0 )
    return;

  var userPassword = escapeHtml( $("#inputUserPassword").val().trim() );
  if( userPassword.length == 0 )
    return;

  $( "#loginSpinner" ).show();

  globalCredentials = make_base_auth(userName, userPassword);

  updateDatabases();
}

function showLoginPopup(){
  $("#loginPopup").modal("show");
}

function editorFocus(){
  let value = editor.getValue();
  editor.setValue("");
  editor.setValue(value);

  editor.setCursor(editor.lineCount(), 0);
  editor.focus();
}

function updateDatabases(){
  jQuery.ajax({
    type: "GET",
    url: "/api/v1/databases",
    beforeSend: function (xhr){
      xhr.setRequestHeader('Authorization', globalCredentials);
    }
  })
  .done(function(data){
    let databases = "";
    for( i in data.result ){
      let dbName = data.result[i];
      databases += "<option value='"+dbName+"'>"+dbName+"</option>";
    }
    $("#inputDatabase").html(databases);

    $("#currentDatabase").html( $("#inputDatabase").val() );

    $("#user").html(data.user);

    let version = data.version;
    let pos = data.version.indexOf("(build");
    if( pos > -1 ) {
      version = version.substring( 0, pos ) + " <span style='font-size: 70%'>" + version.substring( pos ) + "</span>";
    }
    $("#version").html(version);

    $("#loginPopup").modal("hide");
    $("#welcomePanel").hide();
    $("#studioPanel").show();

    initQuery();
  })
  .fail(function( jqXHR, textStatus, errorThrown ){
    globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
  })
  .always(function(data) {
    $("#loginSpinner").hide();
  });
}

function importDatabase(){
  let html = "<label for='inputImportDatabaseName'>Enter the database name:&nbsp;&nbsp;</label><input id='inputImportDatabaseName'>";
  html += "<label for='inputImportDatabaseURL'>Enter the URL of the database:&nbsp;&nbsp;</label><input id='inputImportDatabaseURL'>";

  Swal.fire({
    title: 'Import a database database',
    html: html,
    inputAttributes: {
      autocapitalize: 'off'
    },
    confirmButtonColor: '#3ac47d',
    cancelButtonColor: 'red',
    showCancelButton: true,
    confirmButtonText: 'Send',
  }).then((result) => {
    if (result.value) {
      let database = escapeHtml( $("#inputImportDatabaseName").val().trim() );
      if( database == "" ){
        globalNotify( "Error", "Database name empty", "danger");
        return;
      }

      let url = escapeHtml( $("#inputImportDatabaseURL").val().trim() );
      if( url == "" ){
        globalNotify( "Error", "Database URL empty", "danger");
        return;
      }

      jQuery.ajax({
        type: "POST",
        url: "/api/v1/import",
        data: JSON.stringify( { name: database, url: url, limit: 20000 } ),
        beforeSend: function (xhr){
          xhr.setRequestHeader('Authorization', globalCredentials);
        }
      })
      .done(function(data){
        updateDatabases();
      })
      .fail(function( jqXHR, textStatus, errorThrown ){
        globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
      });
    }
  });
}

function createDatabase(){
  let html = "<label for='inputCreateDatabaseName'>Enter the database name:&nbsp;&nbsp;</label><input id='inputCreateDatabaseName'>";

  Swal.fire({
    title: 'Create a new database',
    html: html,
    inputAttributes: {
      autocapitalize: 'off'
    },
    confirmButtonColor: '#3ac47d',
    cancelButtonColor: 'red',
    showCancelButton: true,
    confirmButtonText: 'Send',
  }).then((result) => {
    if (result.value) {
      let database = escapeHtml( $("#inputCreateDatabaseName").val().trim() );
      if( database == "" ){
        globalNotify( "Error", "Database name empty", "danger");
        return;
      }

      jQuery.ajax({
        type: "POST",
        url: "/api/v1/create/" + database,
        data: "",
        beforeSend: function (xhr){
          xhr.setRequestHeader('Authorization', globalCredentials);
        }
      })
      .done(function(data){
        updateDatabases();
      })
      .fail(function( jqXHR, textStatus, errorThrown ){
        globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
      });
    }
  });
}

function dropDatabase(){
  let database = escapeHtml( $("#inputDatabase").val().trim() );
  if( database == "" ){
    globalNotify( "Error", "Database not selected", "danger");
    return;
  }

  globalConfirm("Drop database", "Are you sure you want to drop the database '"+database+"'?<br>WARNING: The operation cannot be undone.", "warning", function(){
    jQuery.ajax({
      type: "POST",
      url: "/api/v1/drop/" + database,
      data: "",
      beforeSend: function (xhr){
        xhr.setRequestHeader('Authorization', globalCredentials);
      }
    })
    .done(function(data){
      updateDatabases();
    })
    .fail(function( jqXHR, textStatus, errorThrown ){
      globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
    });
  });
}

function executeCommand(reset){
  if( reset ){
    globalTableResult = null;
    globalGraphResult = null;
  }

  if( escapeHtml( $("#inputDatabase").val() ) == "" )
    return;
  if( escapeHtml( $("#inputLanguage").val() ) == "" )
    return;
  if( escapeHtml( editor.getValue() ) == "" )
    return;

  let activeTab = $("#tabs-command .active").attr("id");
  if( activeTab == "tab-table-sel" && globalTableResult == null )
    executeCommandTable();
  else if( activeTab == "tab-graph-sel" && globalGraphResult == null )
    executeCommandGraph();
}

function executeCommandTable(){
  let database = escapeHtml( $("#inputDatabase").val() );
  let language = escapeHtml( $("#inputLanguage").val() );
  let command = escapeHtml( editor.getValue() );

  $("#executeSpinner").show();

  let beginTime = new Date();

  jQuery.ajax({
    type: "POST",
    url: "/api/v1/command/" + database,
    data: JSON.stringify(
      {
        language: language,
        command: command,
        serializer: "default"
      }
    ),
    beforeSend: function (xhr){
      xhr.setRequestHeader('Authorization', globalCredentials);
    }
  })
  .done(function(data){
    globalTableResult = data.result;

    $("#resultJson").val( JSON.stringify(data, null, 2) );

    if ( $.fn.dataTable.isDataTable( '#result' ) )
      try{ $('#result').DataTable().destroy(); $('#result').empty(); } catch(e){};

    var tableColumns = [];
    var tableRecords = [];

    if( data.result.length > 0 ) {
      let columns = {};
      for( i in data.result ){
        let row = data.result[i];

        for( p in row ){
          if( !columns[p] )
            columns[p] = true;
        }
      }

      orderedColumns = [];
      if( columns["@rid"])
        orderedColumns.push("@rid");
      if( columns["@type"])
        orderedColumns.push("@type");

      for( colName in columns ){
        if( !colName.startsWith("@"))
          orderedColumns.push(colName);
      }

      if( columns["@in"])
        orderedColumns.push("@in");
      if( columns["@out"])
        orderedColumns.push("@out");

      for( i in orderedColumns )
        tableColumns.push( { sTitle: escapeHtml( orderedColumns[i] ), "defaultContent": "" } );

      for( i in data.result ){
        let row = data.result[i];


        let record = [];
        for( i in orderedColumns )
          record.push( escapeHtml( row[orderedColumns[i]] ) );
        tableRecords.push( record );
      }
    }

    $( "#result-num" ).html( data.result.length );
    let elapsed = new Date() - beginTime;
    $("#result-elapsed").html( elapsed );

    if( data.result.length > 0 ) {
      $("#result").DataTable({
        orderCellsTop: true,
        fixedHeader: true,
        paging:   true,
        pageLength: 20,
        bLengthChange: true,
        initComplete: function() {
          $('div.dataTables_filter input').attr('autocomplete', 'off')
        },
        aoColumns: tableColumns,
        aaData: tableRecords,
        deferRender: true,
        dom: '<Blf>rt<ip>',
        lengthMenu: [
          [ 10, 20, 50, 100, -1 ],
          [ '10', '20', '50', '100', 'all' ]
        ],
        buttons: [
          { extend: 'copy',
            text: "<i class='fas fa-copy'></i> Copy",
            className: 'btn btn-secondary',
          },
          { extend: 'excel',
            text: "<i class='fas fa-file-excel'></i> Excel",
            className: 'btn btn-secondary',
          },
          { extend: 'csv',
            text: "<i class='fas fa-file-csv'></i> CSV",
            className: 'btn btn-secondary',
          },
          {
            extend: 'pdf',
            text: "<i class='fas fa-file-pdf'></i> PDF",
            className: 'btn btn-secondary',
            orientation: 'landscape',
          },
          {
            extend: 'print',
            text: "<i class='fas fa-print'></i> Print",
            className: 'btn btn-secondary',
            orientation: 'landscape',
          },
        ]
      });

      $('.dt-buttons').css('padding', '7px');
      $('.dataTables_length').css('padding', '7px');
      $('.dataTables_filter').css('padding', '7px');
      $('.buttons-copy').removeClass('buttons-copy').removeClass('buttons-html5');
      $('.buttons-excel').removeClass('buttons-excel').removeClass('buttons-html5');
      $('.buttons-csv').removeClass('buttons-csv').removeClass('buttons-html5');
      $('.buttons-pdf').removeClass('buttons-pdf').removeClass('buttons-html5');
      $('.buttons-print').removeClass('buttons-print').removeClass('buttons-html5');
    }

    // FORCE RESET OF THE SEARCH FIELD
    $("#result_filter>label>input").val("");
  })
  .fail(function( jqXHR, textStatus, errorThrown ){
    globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
  })
  .always(function(data) {
    $("#executeSpinner").hide();
  });
}

function executeCommandGraph(){
  let database = escapeHtml( $("#inputDatabase").val() );
  let language = escapeHtml( $("#inputLanguage").val() );
  let command = escapeHtml( editor.getValue() );

  $("#executeSpinner").show();

  let beginTime = new Date();

  jQuery.ajax({
    type: "POST",
    url: "/api/v1/command/" + database,
    data: JSON.stringify(
      {
        language: language,
        command: command,
        serializer: "graph"
      }
    ),
    beforeSend: function (xhr){
      xhr.setRequestHeader('Authorization', globalCredentials);
    }
  })
  .done(function(data){
    $("#resultJson").val( JSON.stringify(data, null, 2) );

    $( "#result-num" ).html( data.result.vertices.length + data.result.edges.length );
    let elapsed = new Date() - beginTime;
    $("#result-elapsed").html( elapsed );

    globalGraphResult = data.result;
    renderGraph();

    // FORCE RESET OF THE SEARCH FIELD
    $("#inputGraphSearch").val("");
  })
  .fail(function( jqXHR, textStatus, errorThrown ){
    globalNotify( "Error", escapeHtml( jqXHR.responseText ), "danger");
  })
  .always(function(data) {
    $("#executeSpinner").hide();
  });
}