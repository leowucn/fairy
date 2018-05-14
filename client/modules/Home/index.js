import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import List, { ListItem } from 'material-ui/List';
import Typography from 'material-ui/Typography';
import Divider from 'material-ui/Divider';

import MusicList from './musicList'

import { getRanks } from './service'

const drawerWidth = 240;

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  appFrame: {
    zIndex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    width: '100%',
  },
  appBar: {
    width: `calc(100% - ${drawerWidth}px)`,
    height: 64,
    backgroundColor: '#4895ED',
  },
  'appBar-left': {
    marginLeft: drawerWidth,
  },
  drawerPaper: {
    position: 'relative',
    width: drawerWidth,
  },
  toolbar: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing.unit * 3,
  },
  listItemLeftAlign: {
    borderWidth: 1,
    paddingLeft: '17%',
  },
});

class Home extends React.Component {
  constructor() {
    super()
    this.state = {
      ranks: [],
      currentRank: {},
      rankUpdateDate: new Date().getTime(),
    };
  }

  componentDidMount() {
    getRanks().then(res => {
      const rankData = JSON.parse(res.text)
      this.setState({
        ranks: rankData.ranks,
        rankUpdateDate: rankData.date,
        currentRank: rankData.ranks.length > 0 ? rankData.ranks[0] : {},
      })
    })
  }

  handleOnClickRank = (rank) => {
    this.setState({ currentRank: rank })
  }

  getRankList() {
    const { classes } = this.props;
    const { ranks } = this.state
    return (
      ranks.map((rank, i) => {
        return (
          <List key={i}>
            <ListItem
              button
              className={classes.listItemLeftAlign}
              onClick={() => { this.handleOnClickRank(rank) }}
            >
              {rank.title}
            </ListItem>
          </List>
        )
      })
    )
  }

  render() {
    const { classes } = this.props;
    const { currentRank, rankUpdateDate } = this.state;
    console.log('00, currentRank = ', currentRank)
    // console.log('00, date = ', new Date(rankUpdateDate).toISOString())
    const message = [currentRank.title, new Date(rankUpdateDate).toISOString().split('T')[0]].join('   ')

    const drawer = (
      <Drawer
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div
          className={classes.toolbar}
          style={{
            paddingTop: 18,
            fontSize: 27,
            paddingLeft: 16,
            color: '#757575',
          }}
        >
          <strong>
            Fairy音乐排行榜
          </strong>
        </div>
        <Divider />
        {this.getRankList()}
      </Drawer>
    );

    return (
      <div className={classes.root}>
        <div className={classes.appFrame}>
          <AppBar
            position="absolute"
            className={classNames(classes.appBar, classes['appBar-left'])}
          >
            <Toolbar>
              <Typography variant="title" color="inherit" noWrap>
                {message}
              </Typography>
            </Toolbar>
          </AppBar>
          {drawer}
          <main className={classes.content}>
            <div className={classes.toolbar} />
            <MusicList data={currentRank.data || []} />
          </main>
        </div>
      </div>
    );
  }
}

Home.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles, { withTheme: true })(Home);
