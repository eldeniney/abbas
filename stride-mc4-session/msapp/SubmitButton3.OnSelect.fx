// ---- STRIDE MC4 submit validation (patched) ----
Set(varSegment, Trim(DataCardValue2.Selected.Value));
Set(varSession, Trim(DataCardValue1.Selected.Value));
Set(varEmail, Trim(DataCardValue6.Selected.Email));
Set(varIsPB, Upper(varSegment) = "PB");
Set(varCapacity, If(varIsPB, 8, 28));
Set(
    varBooked,
    If(
        varIsPB,
        // PB sessions: count PB registrations on the selected date (cap 8)
        CountRows(Filter('Stride MC4 Registration', Date.Value = varSession, Segment.Value = varSegment)),
        // Other SMB segments share the session, so count every registration on the selected date (cap 28)
        CountRows(Filter('Stride MC4 Registration', Date.Value = varSession))
    )
);
Set(
    varExisting,
    LookUp('Stride MC4 Registration', Email = varEmail || 'Employee Name'.Email = varEmail)
);
If(
    IsBlank(DataCardValue6.Selected) || IsBlank(varSegment) || IsBlank(varSession),
    Notify("Please select Employee Name, Segment and Session Date before submitting.", NotificationType.Warning),
    !IsBlank(varExisting),
    Notify(
        "This employee is already registered for " & varExisting.Date.Value & " (" & varExisting.Segment.Value & "). Only one registration per employee is allowed.",
        NotificationType.Warning
    ),
    varBooked >= varCapacity,
    Notify("The selected session is full. Please choose another date.", NotificationType.Error),
    IfError(
        Patch(
            'Stride MC4 Registration',
            Defaults('Stride MC4 Registration'),
            {
                Title: DataCardValue6.Selected.DisplayName & " | " & varSegment & " | " & varSession,
                'Employee Name': {
                    '@odata.type': "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedUser",
                    Claims: DataCardValue6.Selected.Claims,
                    DisplayName: DataCardValue6.Selected.DisplayName,
                    Email: DataCardValue6.Selected.Email,
                    Department: "",
                    JobTitle: "",
                    Picture: ""
                },
                Email: DataCardValue6.Selected.Email,
                Segment: {Value: varSegment},
                Date: {Value: varSession}
            }
        ),
        Notify("Registration could not be saved: " & FirstError.Message, NotificationType.Error),
        Notify(
            "Your STRIDE MC4 preference for " & varSession & " has been captured successfully.",
            NotificationType.Success
        );
        ResetForm(Form3);
        NewForm(Form3)
    )
)
