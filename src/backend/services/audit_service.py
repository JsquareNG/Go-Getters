from backend.models.auditTrail import AuditTrail

def create_audit_log(
    db,
    application_id,
    event_type,
    entity_type="APPLICATION",
    actor_id=None,
    actor_type=None,
    entity_id=None,
    from_status=None,
    to_status=None,
    description=None,
):
    audit = AuditTrail(
        application_id=application_id,
        actor_id=actor_id,
        actor_type=actor_type,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        from_status=from_status,
        to_status=to_status,
        description=description
    )
    db.add(audit)
    return audit