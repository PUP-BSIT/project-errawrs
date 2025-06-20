$('#deleteModal').on('show.bs.modal', function (event) {
    const button = $(event.relatedTarget);
    const tellerId = button.data('teller-id');
    const tellerName = button.data('teller-name');
    const modal = $(this);

    modal.find('#tellerToDelete').text(tellerName + ' (ID: ' + tellerId + ')');
    modal.find('#tellerIdToDelete').val(tellerId);
});