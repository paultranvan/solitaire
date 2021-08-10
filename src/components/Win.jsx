import React from 'react'
import { Modal, Button } from 'semantic-ui-react'

const Win = ({ gameWon }) => {
  const [open, setOpen] = React.useState(false)

  return gameWon ? (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
    >
      <Modal.Header>C'est gagné !!</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p>Quel talent ! Votre score est de ...</p>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button content="Ok" onClick={() => setOpen(false)} positive />
      </Modal.Actions>
    </Modal>
  ) : null
}

export default Win
