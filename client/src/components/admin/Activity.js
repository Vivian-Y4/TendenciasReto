import React from 'react';
import { Container, Card, ListGroup } from 'react-bootstrap';

const Activity = () => {
  // Aquí deberías obtener las actividades reales del backend con useEffect y axios/fetch.
  // Por ahora, solo mostramos el mensaje si no hay actividades.
  const activities = [];

  return (
    <Container className="my-5">
      <Card className="shadow-sm">
        <Card.Header>
          <h5>Actividad Reciente</h5>
        </Card.Header>
        <Card.Body>
          {activities.length === 0 ? (
            <div className="text-muted">No hay actividad reciente.</div>
          ) : (
            <ListGroup variant="flush">
              {activities.map(activity => (
                <ListGroup.Item key={activity.id}>
                  <strong>{activity.description}</strong>
                  <br />
                  <small className="text-muted">{activity.time}</small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Activity;
